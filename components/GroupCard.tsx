import React from 'react';
import { SupportGroup } from '../types';
import { MapPin, Calendar, Globe, Search, Phone, Share2, Building2, Clock, Tag, Heart, Navigation } from 'lucide-react';
import { useToast } from './Toast';

interface GroupCardProps {
  group: SupportGroup;
  onClick?: (group: SupportGroup) => void;
  isSaved?: boolean;
  onToggleSave?: (group: SupportGroup) => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onClick, isSaved = false, onToggleSave }) => {
  const { showToast } = useToast();

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = [
      group.name,
      group.address && `Address: ${group.address}`,
      group.phoneNumber && `Phone: ${group.phoneNumber}`,
      group.schedule && `Schedule: ${group.schedule}`,
      group.url
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: group.name,
          text: shareText,
          url: group.url
        });
      } catch (err) {
        console.log("Error sharing", err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      showToast("Group info copied to clipboard!", "success");
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleSave) {
      onToggleSave(group);
      showToast(isSaved ? 'Removed from saved' : 'Saved to favorites', isSaved ? 'info' : 'success');
    }
  };

  // Format full address for display
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

  const hasDetailedInfo = group.address || group.phoneNumber || group.schedule;

  // Get completeness score label and color
  const getCompletenessInfo = () => {
    const score = group.completenessScore ?? 0;
    if (score >= 75) return { label: 'Complete Info', color: 'text-green-700', bg: 'bg-green-50' };
    if (score >= 50) return { label: 'Partial Info', color: 'text-amber-700', bg: 'bg-amber-50' };
    return { label: 'Limited Info', color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  // Check if this is a trusted/national resource
  const TRUSTED_ORGS = ['NAMI', 'DBSA', 'AA', 'Alcoholics Anonymous', 'Psychology Today', '7 Cups', 'SAMHSA', 'MHA', 'Mental Health America'];
  const isTrustedOrg = TRUSTED_ORGS.some(org => group.name?.includes(org) || group.sourceName?.includes(org));

  // Collect all applicable badges with priority ordering
  const allBadges: { label: string; bg: string; text: string }[] = [];

  // Add trusted resource badge first for known organizations
  if (isTrustedOrg) {
    allBadges.push({ label: '✓ Verified', bg: 'bg-blue-50', text: 'text-blue-700' });
  }

  if (group.sourceName) {
    allBadges.push({ label: group.sourceName, bg: 'bg-teal-50', text: 'text-teal-700' });
  }
  if (group.isFree) {
    allBadges.push({ label: 'Free', bg: 'bg-green-50', text: 'text-green-700' });
  }
  if (group.isOnline || group.location.toLowerCase().includes('online')) {
    allBadges.push({ label: 'Virtual', bg: 'bg-purple-50', text: 'text-purple-700' });
  }
  if (group.groupType && group.groupType !== 'Support Group') {
    allBadges.push({ label: group.groupType, bg: 'bg-blue-50', text: 'text-blue-700' });
  }
  if (group.isPeerLed === true) {
    allBadges.push({ label: 'Peer-Led', bg: 'bg-orange-50', text: 'text-orange-700' });
  }
  if (group.isPeerLed === false && group.groupType !== 'Therapy Group') {
    allBadges.push({ label: 'Professional', bg: 'bg-cyan-50', text: 'text-cyan-700' });
  }
  if (group.isFree === false) {
    allBadges.push({ label: 'Paid', bg: 'bg-gray-100', text: 'text-gray-600' });
  }

  const MAX_BADGES = 4;
  const visibleBadges = allBadges.slice(0, MAX_BADGES);
  const overflowCount = allBadges.length - MAX_BADGES;

  return (
    <div
      onClick={() => onClick && onClick(group)}
      className="bg-white rounded-xl p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 mb-4 transition-all hover:shadow-md cursor-pointer active:scale-[0.99]"
    >

      {/* Header Badges & Name */}
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {visibleBadges.map((badge, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center px-2 py-0.5 rounded-md ${badge.bg} ${badge.text} text-[10px] font-bold uppercase tracking-wider`}
              >
                {badge.label}
              </span>
            ))}
            {overflowCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-bold">
                +{overflowCount} more
              </span>
            )}
          </div>
          {onToggleSave && (
            <button
              type="button"
              onClick={handleSaveClick}
              className={`p-1.5 rounded-full transition-colors ${
                isSaved
                  ? 'text-red-500 bg-red-50 hover:bg-red-100'
                  : 'text-gray-400 hover:text-red-500 hover:bg-gray-100'
              }`}
              aria-label={isSaved ? 'Remove from saved' : 'Save to favorites'}
            >
              <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        <h3 className="text-lg font-bold text-gray-900 leading-snug">
          {group.name}
        </h3>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-2">
        {group.description}
      </p>

      {/* Detailed Information */}
      <div className="flex flex-col gap-2.5 mb-5">
        {/* Full Address with Distance */}
        {group.address ? (
          <div className="flex items-start text-gray-700 text-sm">
            <Building2 size={15} className="mr-2.5 text-teal-600 shrink-0 mt-0.5" />
            <div className="flex flex-col">
              <span className="font-medium leading-snug">{getFullAddress()}</span>
              {group.distanceMiles !== undefined && (
                <span className="text-xs text-teal-600 font-semibold mt-0.5 flex items-center">
                  <Navigation size={11} className="mr-1" />
                  {group.distanceMiles < 1 ? 'Less than 1 mile' : `${group.distanceMiles} miles away`}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center text-gray-500 text-sm">
            <MapPin size={15} className="mr-2.5 text-teal-600 shrink-0" />
            <span className="font-medium">{group.location}</span>
            {group.distanceMiles !== undefined && (
              <span className="ml-2 text-xs text-teal-600 font-semibold flex items-center">
                <Navigation size={11} className="mr-1" />
                {group.distanceMiles < 1 ? '< 1 mi' : `${group.distanceMiles} mi`}
              </span>
            )}
          </div>
        )}

        {/* Phone Number - Always show if available */}
        {group.phoneNumber && (
          <div className="flex items-center text-gray-700 text-sm">
            <Phone size={15} className="mr-2.5 text-teal-600 shrink-0" />
            <a
              href={`tel:${group.phoneNumber}`}
              onClick={handleActionClick}
              className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
            >
              {group.phoneNumber}
            </a>
          </div>
        )}

        {/* Schedule */}
        {group.schedule && (
          <div className="flex items-center text-gray-600 text-sm">
            <Clock size={15} className="mr-2.5 text-teal-600 shrink-0" />
            <span className="font-medium">{group.schedule}</span>
          </div>
        )}

        {/* Rating */}
        {group.rating && (
          <div className="flex items-center text-gray-600 text-sm">
            <span className="text-yellow-500 mr-1">★</span>
            <span className="font-semibold text-gray-700">{group.rating.toFixed(1)}</span>
            {group.reviewCount && (
              <span className="text-gray-400 ml-1">({group.reviewCount.toLocaleString()} reviews)</span>
            )}
          </div>
        )}
      </div>

      {/* Quick Info Summary - only show if we have detailed info */}
      {(hasDetailedInfo || group.completenessScore !== undefined) && (
        <div className={`rounded-lg px-3 py-2 mb-4 text-xs flex items-center justify-between ${
          getCompletenessInfo().bg
        }`}>
          <div className={`${getCompletenessInfo().color}`}>
            {group.address ? '✓ Address available' : ''}
            {group.address && group.phoneNumber ? ' • ' : ''}
            {group.phoneNumber ? '✓ Phone available' : ''}
            {(group.address || group.phoneNumber) && group.schedule ? ' • ' : ''}
            {group.schedule ? '✓ Schedule available' : ''}
          </div>
          {group.completenessScore !== undefined && (
            <span className={`font-semibold whitespace-nowrap ${getCompletenessInfo().color}`}>
              {getCompletenessInfo().label}
            </span>
          )}
        </div>
      )}

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
            <Phone size={16} className="mr-2 text-teal-600" />
            Call Now
          </a>
        ) : (
          <button
            type="button"
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
