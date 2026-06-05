import { Product, ProductVariant } from '../../../types/fashion';
import Image from 'next/image';
import { formatCurrency } from '../../../lib/localization';
import { useBusiness } from '../../../context/business-context';

interface PosProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export function PosProductCard({ product, onSelect }: PosProductCardProps) {
  const { selectedBusiness } = useBusiness();
  const primaryImage = product.images.find(img => img.isPrimary) || product.images[0];
  
  // Get price range or single price
  const prices = product.variants.map(v => v.salePrice || v.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceDisplay = minPrice === maxPrice 
    ? formatCurrency(minPrice, selectedBusiness?.currencyCode)
    : `${formatCurrency(minPrice, selectedBusiness?.currencyCode)} - ${formatCurrency(maxPrice, selectedBusiness?.currencyCode)}`;

  const totalStock = product.variants.reduce((acc, v) => acc + v.stockQuantity, 0);

  return (
    <div 
      onClick={() => onSelect(product)}
      className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
    >
      <div className="relative aspect-[4/5] w-full bg-slate-100 dark:bg-slate-900">
        {primaryImage && (
          <Image
            src={primaryImage.url}
            alt={product.name}
            fill
            className="object-cover"
          />
        )}
        {totalStock <= 5 && totalStock > 0 && (
          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">
            Low Stock
          </div>
        )}
        {totalStock === 0 && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            Out of Stock
          </div>
        )}
      </div>
      
      <div className="p-3 flex flex-col flex-1">
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{product.brand}</div>
        <h3 className="font-medium text-slate-900 dark:text-white leading-tight mb-2 line-clamp-2">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {priceDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
