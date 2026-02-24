import React, { useState, useEffect } from 'react';
import { Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import API_ENDPOINTS from '../config/api';

interface SurgeryPackageItem {
  description: string;
  amount: number;
}

interface SurgeryPackage {
  _id: string;
  packageName: string;
  description?: string;
  items: SurgeryPackageItem[];
  totalAmount: number;
  lastUsedDate?: string;
  usageCount?: number;
}

interface SurgerySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPackage: (pkg: SurgeryPackage) => void;
}

export const SurgerySelectionModal: React.FC<SurgerySelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectPackage,
}) => {
  const [recentPackages, setRecentPackages] = useState<SurgeryPackage[]>([]);
  const [allPackages, setAllPackages] = useState<SurgeryPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<SurgeryPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 16;

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      // Fetch recent packages
      const recentRes = await fetch(API_ENDPOINTS.SURGERY_PACKAGES.GET_RECENT + '?limit=10');
      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentPackages(Array.isArray(recentData) ? recentData : []);
      }

      // Fetch all packages
      const allRes = await fetch(API_ENDPOINTS.SURGERY_PACKAGES.GET_ALL);
      if (allRes.ok) {
        const allData = await allRes.json();
        const packages = Array.isArray(allData) ? allData : [];
        // Sort alphabetically
        const sorted = [...packages].sort((a, b) =>
          a.packageName.localeCompare(b.packageName)
        );
        setAllPackages(sorted);
        setFilteredPackages(sorted);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);

    if (!term.trim()) {
      const sorted = [...allPackages].sort((a, b) =>
        a.packageName.localeCompare(b.packageName)
      );
      setFilteredPackages(sorted);
    } else {
      const filtered = allPackages.filter(pkg =>
        pkg.packageName.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredPackages(filtered);
    }
  };

  const paginatedPackages = filteredPackages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredPackages.length / itemsPerPage);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#0f0f0f] border border-[#D4A574] rounded-lg w-11/12 h-5/6 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#D4A574]">
          <h2 className="text-2xl font-bold text-white">Select Surgery Package</h2>
          <button
            onClick={onClose}
            className="text-[#8B8B8B] hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Recently Used Section */}
          {recentPackages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-[#D4A574] mb-4">Recently Used</h3>
              <div className="grid grid-cols-4 gap-4">
                {recentPackages.map(pkg => (
                  <PackageCard
                    key={pkg._id}
                    pkg={pkg}
                    onSelect={() => {
                      onSelectPackage(pkg);
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#5a5a5a]" />
              <input
                type="text"
                placeholder="Search package name..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#1a1a1a] border border-[#D4A574] rounded-lg text-white placeholder-[#5a5a5a] focus:outline-none focus:border-[#D4A574]"
              />
            </div>
          </div>

          {/* All Packages Section */}
          {!loading && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                {searchTerm ? 'Search Results' : 'All Packages (Alphabetically)'}
              </h3>
              
              {filteredPackages.length === 0 ? (
                <div className="text-center py-8 text-[#8B8B8B]">
                  No packages found
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-4">
                    {paginatedPackages.map(pkg => (
                      <PackageCard
                        key={pkg._id}
                        pkg={pkg}
                        onSelect={() => {
                          onSelectPackage(pkg);
                          onClose();
                        }}
                      />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="p-2 bg-[#1a1a1a] border border-[#D4A574] rounded hover:border-[#D4A574] disabled:opacity-50 transition-colors"
                      >
                        <ChevronLeft size={20} className="text-[#D4A574]" />
                      </button>
                      <span className="text-[#8B8B8B]">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 bg-[#1a1a1a] border border-[#D4A574] rounded hover:border-[#D4A574] disabled:opacity-50 transition-colors"
                      >
                        <ChevronRight size={20} className="text-[#D4A574]" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4A574] mb-4"></div>
                <p className="text-[#8B8B8B]">Loading packages...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface PackageCardProps {
  pkg: SurgeryPackage;
  onSelect: () => void;
}

const PackageCard: React.FC<PackageCardProps> = ({ pkg, onSelect }) => {
  return (
    <div className="bg-[#1a1a1a] border border-[#D4A574] rounded-lg p-4 hover:border-[#D4A574] transition-all hover:shadow-lg hover:shadow-[#D4A574]/20 cursor-pointer group"
      onClick={onSelect}
    >
      {/* Package Name */}
      <h4 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-[#D4A574] transition-colors">
        {pkg.packageName}
      </h4>

      {/* Item Count */}
      <p className="text-[#8B8B8B] text-xs mb-2">
        {pkg.items.length} item{pkg.items.length !== 1 ? 's' : ''}
      </p>

      {/* Price */}
      <div className="bg-[#0a0a0a] border border-[#D4A574] rounded p-2 mb-3">
        <p className="text-[#8B8B8B] text-xs">Total Amount</p>
        <p className="text-[#D4A574] font-bold text-lg">₹{pkg.totalAmount.toLocaleString('en-IN')}</p>
      </div>

      {/* Usage Info */}
      {pkg.usageCount && pkg.usageCount > 0 && (
        <p className="text-[#5a5a5a] text-xs mb-3">
          Used {pkg.usageCount} time{pkg.usageCount !== 1 ? 's' : ''}
        </p>
      )}

      {/* Add Button */}
      <button className="w-full py-2 bg-[#D4A574] text-[#0a0a0a] rounded hover:bg-[#C9955E] transition-colors font-semibold text-sm">
        Add to Bill
      </button>
    </div>
  );
};

export default SurgerySelectionModal;
