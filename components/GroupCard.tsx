import React from 'react';
import { SupportGroup } from '../types';
import { MapPin, Calendar, Globe, Search, Phone, Share2, ExternalLink } from 'lucide-react';

interface GroupCardProps {
  group: SupportGroup;
  onClick?: (group: SupportGroup) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onClick }) => {
  
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
      // Fallback: Copy to clipboard
      if(group.url) {
          navigator.clipboard.writeText(group.url);
          alert("Link copied to clipboard!");
      }
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
      e.stopPropagation();
  };

  return (
    <div 
        onClick={() => onClick && onClick(group)}
        className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 mb-4 transition-all hover:shadow-md cursor-pointer active:scale-[0.99]"
    >
      
      {/* Header Badge & Name */}
      <div className="flex flex-col gap-1 mb-3">
        <div className="flex items-center justify-between">
            {group.sourceName && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider">
                {group.sourceName}
                </span>
            )}
            {/* Optional: Add Online/In-Person Badge based on location text analysis if simple */}
            {group.location.toLowerCase().includes('online') && (
                 <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold uppercase tracking-wider">
                 Virtual
                 </span>
            )}
        </div>
        <h3 className="text-lg font-bold text-gray-900 leading-snug mt-1">
          {group.name}
        </h3>
      </div>
      
      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-2">
        {group.description}
      </p>

      {/* Metadata */}
      <div className="flex flex-col gap-2 mb-5">
        <div className="flex items-center text-gray-500 text-sm">
          <MapPin size={15} className="mr-2.5 text-teal-600 shrink-0" />
          <span className="truncate font-medium">{group.location}</span>
        </div>
        
        {group.schedule && (
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar size={15} className="mr-2.5 text-teal-600 shrink-0" />
            <span className="font-medium">{group.schedule}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {group.url && (
            <a 
                href={group.url} 
                target="_blank" 
                rel="noreferrer"
                onClick={handleActionClick}
                className={`flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center transition-all hover:opacity-90 active:scale-95 ${
                    group.isFallbackUrl 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200' 
                    : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-200'
                }`}
            >
                {group.isFallbackUrl ? (
                    <Search size={16} className="mr-2" />
                ) : (
                    <Globe size={16} className="mr-2" />
                )}
                {group.isFallbackUrl ? "Find on Google" : "Visit Website"}
            </a>
        )}
        
        {group.phoneNumber ? (
            <a 
                href={`tel:${group.phoneNumber}`}
                onClick={handleActionClick}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-95"
            >
                <Phone size={16} className="mr-2 text-gray-500" />
                Call
            </a>
        ) : (
            <button 
                onClick={handleShare}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-95"
            >
                <Share2 size={16} className="mr-2 text-gray-500" />
                Share
            </button>
        )}
      </div>
    </div>
  );
};