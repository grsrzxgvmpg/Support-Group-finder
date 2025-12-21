import React from 'react';
import { SupportGroup } from '../types';
import { X, MapPin, Calendar, Globe, Phone, Share2, Star, ShieldCheck, ExternalLink, Search } from 'lucide-react';

interface GroupDetailModalProps {
  group: SupportGroup;
  onClose: () => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({ group, onClose }) => {
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: group.name,
          text: `Check out this support group: ${group.name}`,
          url: group.url
        });
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      if(group.url) {
          navigator.clipboard.writeText(group.url);
          alert("Link copied to clipboard!");
      }
    }
  };

  // Prevent clicks inside the modal from closing it
  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
        onClick={handleModalClick}
      >
        {/* Header Section */}
        <div className="relative bg-teal-50 p-6 pb-8 border-b border-teal-100/50 shrink-0">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 hover:text-gray-800 transition-colors"
            >
                <X size={20} />
            </button>
            
            <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                    {group.sourceName && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        {group.sourceName}
                        </span>
                    )}
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                    {group.name}
                 </h2>
                 <div className="flex items-center text-sm text-gray-500">
                    <MapPin size={16} className="text-teal-600 mr-1.5" />
                    {group.location}
                 </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto">
            {/* Description */}
            <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">About this group</h3>
                <p className="text-gray-600 leading-relaxed text-[15px]">
                    {group.description}
                </p>
                <p className="text-gray-600 leading-relaxed text-[15px] mt-2">
                    This group provides a safe space for individuals dealing with {group.topic}. It focuses on peer support and shared experiences.
                </p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar size={18} className="text-teal-600" />
                        <span className="font-semibold text-gray-900 text-sm">Schedule</span>
                    </div>
                    <p className="text-gray-600 text-sm ml-6.5">
                        {group.schedule || "Contact for times"}
                    </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck size={18} className="text-teal-600" />
                        <span className="font-semibold text-gray-900 text-sm">Verified Source</span>
                    </div>
                    <p className="text-gray-600 text-sm ml-6.5">
                        Sourced via {group.sourceName || "Web Search"}
                    </p>
                </div>
            </div>

            {/* Reviews / Ratings Placeholder */}
            <div className="mb-6">
                 <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Reviews & Ratings</h3>
                    {group.rating && (
                        <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                            <Star size={14} className="fill-yellow-400 text-yellow-400 mr-1" />
                            <span className="font-bold text-gray-900 text-sm">{group.rating}</span>
                            <span className="text-gray-400 text-xs ml-1">({group.reviewCount || 10})</span>
                        </div>
                    )}
                 </div>
                 
                 {group.rating ? (
                     <div className="p-4 rounded-xl border border-gray-100 bg-white">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="flex">
                                 {[1,2,3,4,5].map(star => (
                                     <Star key={star} size={14} className={`${star <= Math.round(group.rating!) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                                 ))}
                             </div>
                             <span className="text-sm font-medium text-gray-900">Highly Rated</span>
                         </div>
                         <p className="text-sm text-gray-500 italic">"A helpful community resource."</p>
                     </div>
                 ) : (
                    <div className="p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-center">
                        <p className="text-sm text-gray-400">No ratings available for this group yet.</p>
                    </div>
                 )}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white shrink-0 flex gap-3">
             {group.url && (
                <a 
                    href={group.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${
                        group.isFallbackUrl 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]' 
                        : 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200 active:scale-[0.98]'
                    }`}
                >
                    {group.isFallbackUrl ? <Search size={18} className="mr-2"/> : <Globe size={18} className="mr-2" />}
                    {group.isFallbackUrl ? "Find on Google" : "Visit Website"}
                </a>
            )}

            {group.phoneNumber ? (
                <a 
                    href={`tel:${group.phoneNumber}`}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-[0.98]"
                >
                    <Phone size={18} className="mr-2 text-gray-500" />
                    Call
                </a>
            ) : (
                <button 
                    onClick={handleShare}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-[0.98]"
                >
                    <Share2 size={18} className="mr-2 text-gray-500" />
                    Share
                </button>
            )}
        </div>
      </div>
    </div>
  );
};