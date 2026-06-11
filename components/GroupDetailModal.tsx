import React, { useEffect, useRef } from 'react';
import { SupportGroup } from '../types';
import { X, MapPin, Globe, Phone, Share2, Star, ShieldCheck, Search, Building2, Clock, Copy, Navigation, Tag } from 'lucide-react';
import { useToast } from './Toast';
import { shareContent } from '../services/platform';

interface GroupDetailModalProps {
  group: SupportGroup;
  onClose: () => void;
}

export const GroupDetailModal: React.FC<GroupDetailModalProps> = ({ group, onClose }) => {
  const { showToast } = useToast();
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus management - focus close button when modal opens
  useEffect(() => {
    closeButtonRef.current?.focus();

    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Lock background scrolling while the modal is open
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Format full address
  const getFullAddress = () => {
    if (group.address) {
      const parts = [group.address];
      if (group.city) parts.push(group.city);
      if (group.state) parts.push(group.state);
      if (group.zipCode) parts.push(group.zipCode);
      return parts.join(', ');
    }
    return group.location;
  };

  const handleShare = async () => {
    const shareText = [
      group.name,
      '',
      group.address && `Address: ${getFullAddress()}`,
      group.phoneNumber && `Phone: ${group.phoneNumber}`,
      group.schedule && `Schedule: ${group.schedule}`,
      group.website && `Website: ${group.website}`,
      '',
      group.url
    ].filter(Boolean).join('\n');

    const outcome = await shareContent({ title: group.name, text: shareText, url: group.url });
    if (outcome === 'copied') {
      showToast('Group info copied to clipboard!', 'success');
    } else if (outcome === 'failed') {
      showToast('Could not share group info', 'error');
    }
  };

  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage, 'success');
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  const handleCopyAddress = () => copyToClipboard(getFullAddress(), 'Address copied!');

  const handleCopyPhone = () => {
    if (group.phoneNumber) {
      copyToClipboard(group.phoneNumber, 'Phone number copied!');
    }
  };

  const handleGetDirections = () => {
    const address = getFullAddress();
    const mapsUrl = group.latitude && group.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${group.latitude},${group.longitude}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(mapsUrl, '_blank');
  };

  const handleModalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 flex flex-col max-h-[85vh]"
        onClick={handleModalClick}
      >
        {/* Header Section */}
        <div className="relative bg-teal-50 p-6 pb-8 border-b border-teal-100/50 shrink-0">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col gap-3">
            <div className="flex gap-2 flex-wrap">
              {group.sourceName && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {group.sourceName}
                </span>
              )}
              {group.groupType && group.groupType !== 'Support Group' && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {group.groupType}
                </span>
              )}
              {(group.isOnline || group.location.toLowerCase().includes('online')) && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Virtual
                </span>
              )}
              {group.isFree && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Free
                </span>
              )}
            </div>
            <h2 id="modal-title" className="text-2xl font-bold text-gray-900 leading-tight">
              {group.name}
            </h2>
            <div className="flex items-center text-sm text-gray-500">
              <MapPin size={16} className="text-teal-600 mr-1.5" aria-hidden="true" />
              {group.location}
              {group.distanceMiles !== undefined && (
                <span className="ml-2 inline-flex items-center text-xs text-teal-700 font-semibold bg-teal-100/70 px-2 py-0.5 rounded-full">
                  <Navigation size={11} className="mr-1" aria-hidden="true" />
                  {group.distanceMiles < 1 ? '< 1 mi' : `${group.distanceMiles} mi`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto">
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">About this group</h3>
            <p className="text-gray-600 leading-relaxed text-[15px]">
              {group.description}
            </p>
          </div>

          {/* Contact Information - Key Section */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-3">Contact Information</h3>
            <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
              {/* Address */}
              {group.address && (
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Building2 size={18} className="text-teal-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</span>
                        <p className="text-gray-900 font-medium mt-0.5">{getFullAddress()}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={handleCopyAddress}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                        aria-label="Copy address to clipboard"
                      >
                        <Copy size={16} className="text-gray-400" />
                      </button>
                      <button
                        type="button"
                        onClick={handleGetDirections}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                        aria-label="Get directions to this address"
                      >
                        <Navigation size={16} className="text-teal-600" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Phone */}
              {group.phoneNumber && (
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone size={18} className="text-teal-600 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</span>
                        <p className="text-gray-900 font-medium mt-0.5">
                          <a href={`tel:${group.phoneNumber}`} className="text-teal-700 hover:underline">
                            {group.phoneNumber}
                          </a>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Copy phone number"
                    >
                      <Copy size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Website */}
              {group.website && (
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-teal-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website</span>
                      <p className="text-teal-700 font-medium mt-0.5 truncate">
                        <a href={group.website} target="_blank" rel="noreferrer" className="hover:underline">
                          {group.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Schedule */}
              {group.schedule && (
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock size={18} className="text-teal-600 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Schedule</span>
                      <p className="text-gray-900 font-medium mt-0.5">{group.schedule}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show message if no contact info */}
              {!group.address && !group.phoneNumber && !group.website && !group.schedule && (
                <div className="p-4 text-center">
                  <p className="text-gray-400 text-sm">Contact the source website for details.</p>
                </div>
              )}
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-teal-600" />
                <span className="font-semibold text-gray-900 text-xs">Source</span>
              </div>
              <p className="text-gray-600 text-sm">
                {group.sourceName || "Web Search"}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={16} className="text-teal-600" />
                <span className="font-semibold text-gray-900 text-xs">Topic</span>
              </div>
              <p className="text-gray-600 text-sm capitalize">
                {group.topic}
              </p>
            </div>
          </div>

          {/* Reviews / Ratings */}
          {group.rating && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Rating</h3>
                <div className="flex items-center bg-yellow-50 px-2 py-1 rounded-lg">
                  <Star size={14} className="fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-bold text-gray-900 text-sm">{group.rating.toFixed(1)}</span>
                  {group.reviewCount && (
                    <span className="text-gray-400 text-xs ml-1">({group.reviewCount.toLocaleString()})</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 bg-white">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={16} className={`${star <= Math.round(group.rating!) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {group.rating >= 4.5 ? 'Excellent' : group.rating >= 4 ? 'Very Good' : group.rating >= 3.5 ? 'Good' : 'Rated'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-3 mb-3">
            {group.url && (
              <a
                href={group.url}
                target="_blank"
                rel="noreferrer"
                className={`flex-1 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center transition-all ${group.isFallbackUrl
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-[0.98]'
                    : 'bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200 active:scale-[0.98]'
                  }`}
              >
                {group.isFallbackUrl ? <Search size={18} className="mr-2" /> : <Globe size={18} className="mr-2" />}
                {group.isFallbackUrl ? "Find on Google" : "Visit Website"}
              </a>
            )}

            {group.phoneNumber ? (
              <a
                href={`tel:${group.phoneNumber}`}
                className="flex-1 bg-white border-2 border-teal-600 text-teal-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-teal-50 transition-colors active:scale-[0.98]"
              >
                <Phone size={18} className="mr-2" />
                Call Now
              </a>
            ) : (
              <button
                type="button"
                onClick={handleShare}
                className="flex-1 bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-gray-50 transition-colors active:scale-[0.98]"
              >
                <Share2 size={18} className="mr-2 text-gray-500" />
                Share
              </button>
            )}
          </div>

          {/* Directions button if we have an address */}
          {group.address && (
            <button
              type="button"
              onClick={handleGetDirections}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Navigation size={16} className="mr-2" />
              Get Directions
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
