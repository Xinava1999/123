import React, { useState, useEffect, useRef } from 'react';
import { Camera, Loader2, Heart, Plus, X, ImageIcon, AlertCircle, Trash2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { useToast } from './Toast';
import { CommentSection } from './CommentSection';

interface GalleryImage {
  id: string;
  url: string;
  caption: string;
  authorName: string;
  likes: number;
  createdAt: any;
}

export const Gallery: React.FC<{ nickname: string }> = ({ nickname }) => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [expandedImageId, setExpandedImageId] = useState<string | null>(null);
  const [likedImages, setLikedImages] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast, ToastComponent } = useToast();

  const mockUid = localStorage.getItem('mock_uid') || 'anonymous';

  useEffect(() => {
    const fetchImages = async () => {
      console.log('Fetching images from API...');
      try {
        const response = await fetch('/api/images');
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`Fetched ${data.length} images`);
            setImages(data);
          } else {
            const text = await response.text();
            console.error('Expected JSON but got:', text.substring(0, 100));
          }
        } else {
          console.error('API response not ok:', response.status);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };

    fetchImages();
    const interval = setInterval(fetchImages, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name);
      setShowUploadModal(true);
    }
  };

  const handleUpload = async () => {
    console.log('Starting upload process...');
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast('请选择一张图片！', 'error');
      return;
    }
    if (!caption.trim()) {
      showToast('请填写描述！', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      console.log('Compressing image...');
      // 1. 读取并压缩图片
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const MAX_WIDTH = 800;
            if (width > MAX_WIDTH) {
              height = (MAX_WIDTH / width) * height;
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            resolve(dataUrl);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setUploadProgress(50);
      console.log('Image compressed, base64 length:', base64.length);

      if (base64.length > 1500000) {
        showToast('图片还是太大了（超过 1.5MB），请尝试上传更小的图片。', 'error');
        setUploading(false);
        return;
      }

      // 2. 通过 API 存入 Firestore
      console.log('Sending POST request to /api/images...');
      const response = await fetch('/api/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: base64,
          caption,
          authorName: nickname || '匿名炉友',
        }),
      });

      console.log('POST response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Upload successful, ID:', result.id);
        setUploadProgress(100);
        showToast('发布成功！', 'success');
        
        setTimeout(async () => {
          setUploading(false);
          setUploadProgress(0);
          setShowUploadModal(false);
          setCaption('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          
          // 立即刷新
          const res = await fetch('/api/images');
          if (res.ok) {
            const data = await res.json();
            setImages(data);
          }
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || 'Upload failed');
      }
      
    } catch (error: any) {
      console.error('Upload failed:', error);
      showToast(`发布失败: ${error.message}`, 'error');
      setUploading(false);
    }
  };

  const handleLike = async (imageId: string) => {
    if (likedImages.has(imageId)) {
      showToast('你已经点过赞啦！', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/images/${imageId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: mockUid })
      });
      if (response.ok) {
        setImages(prev => prev.map(img => 
          img.id === imageId ? { ...img, likes: (img.likes || 0) + 1 } : img
        ));
        setLikedImages(prev => new Set(prev).add(imageId));
        showToast('点赞成功！', 'success');
      } else {
        const data = await response.json();
        showToast(data.error || '点赞失败', 'error');
      }
    } catch (error) {
      console.error('Error liking image:', error);
      showToast('点赞失败', 'error');
    }
  };

  const adminToken = localStorage.getItem('admin_token') || '';
  const isAdmin = !!adminToken;

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这张图片吗？')) return;
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken }
      });
      if (response.ok) {
        setImages(prev => prev.filter(img => img.id !== id));
      } else {
        alert('删除失败，权限不足。');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  };

  return (
    <div className="pb-32">
      <ToastComponent />
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
                className={`absolute bottom-2 right-2 border-2 border-black p-1.5 transition-all flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none z-10 ${
                  likedImages.has(img.id) ? 'bg-red-500 text-white' : 'bg-white hover:bg-red-500 hover:text-white'
                }`}
              >
                <Heart size={12} className={img.likes > 0 || likedImages.has(img.id) ? 'fill-current' : ''} />
                <span className="font-black text-[10px]">{img.likes || 0}</span>
              </button>
              <button 
                onClick={() => setExpandedImageId(expandedImageId === img.id ? null : img.id)}
                className="absolute bottom-2 left-2 bg-white border-2 border-black p-1.5 hover:bg-yellow-400 transition-all flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none z-10"
              >
                <MessageSquare size={12} />
                <span className="font-black text-[10px] uppercase">{expandedImageId === img.id ? '收起' : '评论'}</span>
              </button>
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(img.id)}
                  className="absolute top-2 right-2 bg-white border-2 border-black p-1.5 hover:bg-red-500 hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none z-10"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="p-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold uppercase bg-yellow-400 px-1 border border-black truncate max-w-[60%]">
                  {img.authorName}
                </span>
                <span className="text-[8px] text-gray-400 font-mono">
                  {img.createdAt ? (
                    typeof img.createdAt === 'string' 
                      ? format(new Date(img.createdAt), 'MM/dd')
                      : (img.createdAt.toDate ? format(img.createdAt.toDate(), 'MM/dd') : '...')
                  ) : '...'}
                </span>
              </div>
              {img.caption && <p className="text-[10px] font-medium leading-tight line-clamp-2">{img.caption}</p>}
              
              <AnimatePresence>
                {expandedImageId === img.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <CommentSection type="images" id={img.id} nickname={nickname} />
                  </motion.div>
                )}
              </AnimatePresence>
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
