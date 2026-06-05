import React from 'react';
import { Package, AlertTriangle, TrendingUp, DollarSign, Activity } from 'lucide-react';
import { useInventory } from '../../../context/inventory-context';

export default function InventoryStats() {
  const { products } = useInventory();

  const stats = products.reduce((acc, product) => {
    product.variants.forEach(variant => {
      acc.totalSkus++;
      acc.totalStock += variant.stockQuantity;
      acc.totalValue += variant.stockQuantity * (variant.price || product.basePrice);
      acc.totalCost += variant.stockQuantity * (variant.costPrice || 0); // Assuming 0 if no cost price
      
      if (variant.stockQuantity <= 0) acc.outOfStock++;
      else if (variant.stockQuantity < 10) acc.lowStock++;
    });
    return acc;
  }, {
    totalSkus: 0,
    totalStock: 0,
    totalValue: 0,
    totalCost: 0,
    lowStock: 0,
    outOfStock: 0
  });

  const cards = [
    {
      title: 'Total Stock',
      value: stats.totalStock.toLocaleString(),
      subValue: `${stats.totalSkus} SKUs`,
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Inventory Value',
      value: `$${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      subValue: `Cost: $${stats.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Low Stock',
      value: stats.lowStock.toString(),
      subValue: 'Reorder needed',
      icon: AlertTriangle,
      color: 'amber'
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStock.toString(),
      subValue: 'Lost sales risk',
      icon: Activity,
      color: 'red'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, idx) => (
        <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{card.value}</h3>
            </div>
            <div className={`p-3 rounded-lg bg-${card.color}-100 dark:bg-${card.color}-900/30 text-${card.color}-600 dark:text-${card.color}-400`}>
              <card.icon size={24} />
            </div>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {card.subValue}
          </div>
        </div>
      ))}
    </div>
  );
}
