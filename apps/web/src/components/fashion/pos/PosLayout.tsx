'use client';

import { useState } from 'react';
import { PosProductGrid } from './PosProductGrid';
import { PosCart } from './PosCart';
import { PosVariantSelector } from './PosVariantSelector';
import { PosCheckoutModal } from './PosCheckoutModal';
import PosCustomerModal from './PosCustomerModal';
import PosHistoryModal from './PosHistoryModal';
import { Product } from '../../../types/fashion';
import { usePos } from '../../../context/pos-context';

export function PosLayout() {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { products } = usePos();

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Left Side: Product Grid */}
      <div className="flex-1 min-w-0 border-r border-slate-200 dark:border-slate-700">
        <PosProductGrid 
          products={products} 
          onProductSelect={setSelectedProduct}
          onHistoryClick={() => setIsHistoryOpen(true)}
        />
      </div>

      {/* Right Side: Cart */}
      <div className="w-[400px] flex-shrink-0 shadow-xl z-10">
        <PosCart onAddCustomerClick={() => setIsCustomerModalOpen(true)} />
      </div>

      {/* Modals */}
      <PosVariantSelector 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />
      <PosCheckoutModal />
      <PosCustomerModal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)} 
      />
      <PosHistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
      />
    </div>
  );
}
