"use client";

interface ResourceTabsProps {
  activeTab: 'all' | 'myUploads';
  onTabChange: (tab: 'all' | 'myUploads') => void;
}

export function ResourceTabs({ activeTab, onTabChange }: ResourceTabsProps) {
  return (
    <div className="flex border-b mb-6 px-6">
      <button 
        className={`px-4 py-2 ${activeTab === 'all' ? 'border-b-2 border-primary font-medium' : ''}`}
        onClick={() => onTabChange('all')}
      >
        All Resources
      </button>
      <button 
        className={`px-4 py-2 ${activeTab === 'myUploads' ? 'border-b-2 border-primary font-medium' : ''}`}
        onClick={() => onTabChange('myUploads')}
      >
        My Uploads
      </button>
    </div>
  );
}
