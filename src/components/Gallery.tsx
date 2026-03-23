import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { db, storage, auth } from '../firebase';
import { Camera, Loader2, Heart, Plus, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../utils/firestoreError';

interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  authorName: string;
  likes: number;
  createdAt: Timestamp;
}

export const Gallery: React.FC<{ nickname: string }> = ({ nickname }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [caption, setCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'images'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newImages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          likes: data.likes || 0,
          ...data
        } as GalleryImage;
      });
      setImages(newImages);
    }, (error) => {
      console.error('onSnapshot error:', error);
      handleFirestoreError(error, OperationType.LIST, 'images');
    });
    return unsubscribe;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      alert('请选择一张图片！');
      return;
    }
    if (!caption.trim()) {
      alert('请填写描述！');
      return;
    }

    setUploading(true);
    setUploadProgress(20);

    // 确保已登录
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (authError) {
        console.error('Auth failed:', authError);
        alert('登录失败，请刷新页面重试。');
        setUploading(false);
        return;
      }
    }

    try {
      // 1. 读取并压缩图片
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // 如果图片太大，等比缩小
            const MAX_WIDTH = 800;
            if (width > MAX_WIDTH) {
              height = (MAX_WIDTH / width) * height;
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // 导出为压缩后的 base64 (质量 0.7)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(60);

      if (base64.length > 1000000) {
        alert('图片还是太大了（超过 1MB），请尝试上传更小的图片或截图。');
        setUploading(false);
        return;
      }

      // 2. 直接存入 Firestore
      const docRef = await addDoc(collection(db, 'images'), {
        url: base64, // 这里的 url 现在存的是 base64 字符串
        caption,
        authorName: nickname || '匿名炉友',
        likes: 0,
        createdAt: serverTimestamp(),
      });

      setUploadProgress(100);
      setUploading(false);
      setUploadProgress(0);
      setShowUploadModal(false);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`发布失败: ${error.message}`);
      setUploading(false);
    }
  };

  const handleLike = async (imageId: string) => {
    try {
      const imageRef = doc(db, 'images', imageId);
      await updateDoc(imageRef, {
        likes: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `images/${imageId}`);
    }
  };

  return (
    <div className="pb-32">
      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((img) => (
          <motion.article 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={img.id} 
            className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden group relative"
          >
            <div className="aspect-square bg-gray-100 overflow-hidden relative">
              <img
                src={img.url}
                alt={img.caption}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => handleLike(img.id)}
                className="absolute bottom-2 right-2 bg-white border-2 border-black p-1.5 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none z-10"
              >
                <Heart size={12} className={img.likes > 0 ? 'fill-current' : ''} />
                <span className="font-black text-[10px]">{img.likes || 0}</span>
              </button>
            </div>
            <div className="p-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold uppercase bg-yellow-400 px-1 border border-black truncate max-w-[60%]">
                  {img.authorName}
                </span>
                <span className="text-[8px] text-gray-400 font-mono">
                  {img.createdAt?.toDate ? format(img.createdAt.toDate(), 'MM/dd') : '...'}
                </span>
              </div>
              {img.caption && <p className="text-[10px] font-medium leading-tight line-clamp-2">{img.caption}</p>}
            </div>
          </motion.article>
        ))}
      </div>

      {/* Empty State */}
      {images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-black/20 rounded-2xl">
          <ImageIcon size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-400 font-bold uppercase tracking-widest">还没有人分享照片哦</p>
        </div>
      )}

      {/* Fixed Bottom Upload Trigger */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-xs px-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full bg-black text-white p-5 font-black shadow-[8px_8px_0px_0px_rgba(254,240,138,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center space-x-3 border-4 border-black group"
        >
          <div className="bg-yellow-400 text-black p-1 group-hover:rotate-12 transition-transform">
            <Camera size={24} />
          </div>
          <span className="text-lg italic tracking-tighter">点击上传</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black w-full max-w-md p-6 shadow-[12px_12px_0px_0px_rgba(254,240,138,1)]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black italic tracking-tighter">准备发布</h3>
                <button onClick={() => setShowUploadModal(false)} className="hover:rotate-90 transition-transform">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label className="text-[10px] font-bold tracking-widest">描述</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="写点什么吧..."
                    className="w-full p-3 border-2 border-black focus:outline-none focus:bg-yellow-50 font-medium h-24 resize-none"
                  />
                </div>

                {uploading && (
                  <div className="w-full bg-gray-100 border-2 border-black h-4 relative overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="absolute inset-0 bg-yellow-400"
                    />
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full bg-black text-white p-4 font-bold tracking-widest hover:bg-yellow-400 hover:text-black transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                  <span>{uploading ? `正在上传 ${Math.round(uploadProgress)}%` : '确认发布'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
