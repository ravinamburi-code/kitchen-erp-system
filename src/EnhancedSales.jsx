import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Package, AlertCircle, Clock, TrendingUp, MapPin,
  Search, X, CheckCircle, AlertTriangle, Store, Lock, Unlock,
  RefreshCw, Calendar, Hash, ChevronDown, ChevronUp, Edit2, Save
} from 'lucide-react';

const EnhancedSales = ({
  sales = [],
  setSales = () => {},
  dispatch = [],
  setDispatch = () => {},
  coldRoomStock = {},
  saveToDatabase = () => {},
  getAllDishNames,
  prepLog = []
}) => {
  // Default dish names if getAllDishNames is not provided
  const defaultDishNames = [
    'Chicken Biryani',
    'Lamb Biryani',
    'Veg Biryani',
    'Donne Biryani Chicken',
    'Donne Biryani Lamb',
    'Prawns Pulav',
    'Chicken Curry',
    'Lamb Curry',
    'Fish Curry',
    'Paneer Butter Masala',
    'Dal Tadka',
    'Chicken Pakora',
    'Veg Samosa',
    'Onion Bhaji',
    'Salan',
    'Raitha'
  ];

  // Safe function to get dish names
  const getDishNames = () => {
    if (typeof getAllDishNames === 'function') {
      const names = getAllDishNames();
      return names && names.length > 0 ? names : defaultDishNames;
    }
    // Try to get from sales and dispatch data
    const fromSales = [...new Set(sales.map(s => s.dishName))];
    const fromDispatch = [...new Set(dispatch.map(d => d.dishName))];
    const combined = [...new Set([...fromSales, ...fromDispatch])];
    return combined.length > 0 ? combined : defaultDishNames;
  };
  // Shop Status Management
  const [shopStatus, setShopStatus] = useState(() => {
    const saved = localStorage.getItem('shopStatus');
    return saved ? JSON.parse(saved) : {
      'Eastham': { isOpen: false, openTime: null, closeTime: null },
      'Bethnal Green': { isOpen: false, openTime: null, closeTime: null }
    };
  });

  const [selectedLocation, setSelectedLocation] = useState('Eastham');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [editingStock, setEditingStock] = useState({});
  const [stockData, setStockData] = useState({});

  // Categories for dishes
  const dishCategories = {
    'Chicken Biryani': 'Biryani',
    'Lamb Biryani': 'Biryani',
    'Veg Biryani': 'Biryani',
    'Donne Biryani Chicken': 'Biryani',
    'Donne Biryani Lamb': 'Biryani',
    'Prawns Pulav': 'Biryani',
    'Chicken Curry': 'Curry',
    'Lamb Curry': 'Curry',
    'Fish Curry': 'Curry',
    'Paneer Butter Masala': 'Curry',
    'Dal Tadka': 'Curry',
    'Chicken Pakora': 'Starters',
    'Veg Samosa': 'Starters',
    'Onion Bhaji': 'Starters',
    'Salan': 'Sides',
    'Raitha': 'Sides'
  };

  // Initialize stock data from sales and dispatch
  useEffect(() => {
    initializeStockData();
  }, [sales, dispatch, selectedLocation]);

  const initializeStockData = () => {
    const allDishes = getDishNames();
    const locationStock = {};

    allDishes.forEach(dish => {
      const category = dishCategories[dish] || 'Other';

      // Get old stock (from previous day closings - not today)
      const oldStock = sales
        .filter(s =>
          s.location === selectedLocation &&
          s.dishName === dish &&
          s.endOfDay === true &&
          s.remainingPortions > 0 &&
          s.date !== todayDate // Exclude today's closings
        )
        .reduce((sum, s) => sum + s.remainingPortions, 0);

      // Get today's received batches from dispatch
      const todayDate = new Date().toISOString().split('T')[0];
      const todayReceived = dispatch
        .filter(d =>
          d.dishName === dish &&
          d.date === todayDate &&
          ((selectedLocation === 'Eastham' && d.easthamSent > 0) ||
           (selectedLocation === 'Bethnal Green' && d.bethnalSent > 0))
        );

      // Get current sales data for today (to preserve manual updates)
      const todaysSales = sales
        .filter(s =>
          s.location === selectedLocation &&
          s.dishName === dish &&
          s.date === todayDate &&
          !s.endOfDay
        );

      // Get all active batches for this dish at this location
      const activeBatches = [];
      const processedBatchNumbers = new Set(); // Track processed batches to avoid duplicates

      // Add old stock batches (from previous days)
      sales
        .filter(s =>
          s.location === selectedLocation &&
          s.dishName === dish &&
          s.endOfDay === true &&
          s.remainingPortions > 0 &&
          s.date !== todayDate // Only old stock from previous days
        )
        .forEach(s => {
          const batchNumber = s.batchNumber || `OLD-${s.id}`;
          if (!processedBatchNumbers.has(batchNumber)) {
            processedBatchNumbers.add(batchNumber);
            activeBatches.push({
              id: s.id,
              batchNumber: batchNumber,
              receivedPortions: s.remainingPortions,
              remainingPortions: s.remainingPortions,
              dateMade: s.dateMade || s.closedDate,
              dateReceived: s.closedDate,
              expiryDate: s.expiryDate || new Date(new Date(s.closedDate).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              isOldStock: true,
              preparedBy: s.preparedBy || 'Previous Day'
            });
          }
        });

      // Add today's received batches from dispatch
      todayReceived.forEach(d => {
        const portions = selectedLocation === 'Eastham' ? d.easthamSent : d.bethnalSent;
        const batchNumber = d.batchNumber || `BATCH-${d.id}`;

        // Skip if we already processed this batch
        if (processedBatchNumbers.has(batchNumber)) {
          return;
        }
        processedBatchNumbers.add(batchNumber);

        // Check if we have a sales update for this batch from today
        const salesUpdate = todaysSales.find(s => s.batchNumber === batchNumber);
        const remainingPortions = salesUpdate ? salesUpdate.remainingPortions : portions;

        // Find the prep log entry for this dispatch
        const prepEntry = prepLog.find(p =>
          p.dishName === dish &&
          p.date === d.date &&
          !p.processed === false
        );

        activeBatches.push({
          id: `${d.id}-${selectedLocation}`,
          batchNumber: batchNumber,
          receivedPortions: portions,
          remainingPortions: remainingPortions,
          dateMade: prepEntry?.date || d.date,
          dateReceived: todayDate,
          expiryDate: d.expiryDate || new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isOldStock: false,
          preparedBy: prepEntry?.preparedBy || d.preparedBy || 'Kitchen'
        });
      });

      // Calculate totals
      const totalOldStock = activeBatches
        .filter(b => b.isOldStock)
        .reduce((sum, b) => sum + b.remainingPortions, 0);

      const totalReceivedToday = activeBatches
        .filter(b => !b.isOldStock)
        .reduce((sum, b) => sum + b.receivedPortions, 0);

      const totalRemaining = activeBatches
        .reduce((sum, b) => sum + b.remainingPortions, 0);

      const soldToday = totalReceivedToday - activeBatches
        .filter(b => !b.isOldStock)
        .reduce((sum, b) => sum + b.remainingPortions, 0);

      locationStock[dish] = {
        dishName: dish,
        category,
        oldStock: totalOldStock,
        receivedToday: totalReceivedToday,
        remaining: totalRemaining,
        soldToday: soldToday,
        totalAvailable: totalRemaining,
        batches: activeBatches.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
        isLowStock: totalRemaining > 0 && totalRemaining <= 3,
        isOutOfStock: totalRemaining === 0 && totalReceivedToday > 0,
        needsUrgentRestock: totalRemaining <= 3 || (totalRemaining === 0 && totalReceivedToday > 0)
      };
    });

    setStockData(locationStock);
  };

  // Get expiry status with colors
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', color: 'gray', message: 'No expiry' };

    const now = new Date();
    const expiry = new Date(expiryDate);
    const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 0) {
      return { status: 'expired', color: 'red', message: 'EXPIRED', priority: 0 };
    } else if (hoursUntilExpiry < 24) {
      return { status: 'urgent', color: 'orange', message: `${Math.floor(hoursUntilExpiry)}h left`, priority: 1 };
    } else if (hoursUntilExpiry < 48) {
      return { status: 'warning', color: 'yellow', message: `1 day left`, priority: 2 };
    } else {
      const days = Math.floor(hoursUntilExpiry / 24);
      return { status: 'good', color: 'green', message: `${days}d left`, priority: 3 };
    }
  };

  // Open Shop
  const handleOpenShop = () => {
    if (window.confirm(`Open ${selectedLocation} for business?`)) {
      const newStatus = {
        ...shopStatus,
        [selectedLocation]: {
          isOpen: true,
          openTime: new Date().toISOString(),
          closeTime: null
        }
      };
      setShopStatus(newStatus);
      localStorage.setItem('shopStatus', JSON.stringify(newStatus));

      // Record opening in database
      saveToDatabase && saveToDatabase('shop_status', {
        location: selectedLocation,
        status: 'open',
        timestamp: new Date().toISOString(),
        action: 'shop_opened'
      });

      alert(`✅ ${selectedLocation} is now OPEN for business!`);
    }
  };

  // Close Shop
  const handleCloseShop = () => {
    const locationData = Object.values(stockData);
    const totalRemaining = locationData.reduce((sum, item) => sum + item.remaining, 0);
    const totalSold = locationData.reduce((sum, item) => sum + item.soldToday, 0);

    if (window.confirm(
      `🏪 CLOSE ${selectedLocation} FOR THE DAY?\n\n` +
      `📊 Today's Summary:\n` +
      `• Total Sold: ${totalSold} portions\n` +
      `• Remaining Stock: ${totalRemaining} portions\n` +
      `• Items will become OLD STOCK tomorrow\n\n` +
      `Continue?`
    )) {
      const todayDate = new Date().toISOString().split('T')[0];
      const closingEntries = [];

      Object.values(stockData).forEach(item => {
        if (item.remaining > 0) {
          item.batches.forEach(batch => {
            if (batch.remainingPortions > 0 && !batch.isOldStock) {
              // Only close today's batches, not already old stock
              closingEntries.push({
                id: `close-${batch.id}-${Date.now()}`,
                location: selectedLocation,
                dishName: item.dishName,
                batchNumber: batch.batchNumber,
                remainingPortions: batch.remainingPortions,
                endOfDay: true,
                date: todayDate, // Important: mark with today's date
                closedDate: todayDate,
                closedTime: new Date().toLocaleTimeString(),
                dateMade: batch.dateMade,
                expiryDate: batch.expiryDate,
                preparedBy: batch.preparedBy
              });
            }
          });
        }
      });

      // Update sales with closing entries
      setSales(prev => [...prev, ...closingEntries]);

      // Update shop status
      const newStatus = {
        ...shopStatus,
        [selectedLocation]: {
          isOpen: false,
          openTime: shopStatus[selectedLocation].openTime,
          closeTime: new Date().toISOString()
        }
      };
      setShopStatus(newStatus);
      localStorage.setItem('shopStatus', JSON.stringify(newStatus));

      // Save to database
      closingEntries.forEach(entry => {
        saveToDatabase && saveToDatabase('sales', {
          dish_name: entry.dishName,
          location: entry.location,
          batch_number: entry.batchNumber,
          remaining_portions: entry.remainingPortions,
          end_of_day: true,
          date: entry.date,
          closed_date: entry.closedDate,
          closed_time: entry.closedTime
        });
      });

      alert(
        `✅ ${selectedLocation} CLOSED SUCCESSFULLY!\n\n` +
        `📊 Final Report:\n` +
        `• Sold Today: ${totalSold} portions\n` +
        `• Remaining Stock: ${totalRemaining} portions\n` +
        `• Stock has been marked as OLD STOCK for tomorrow`
      );
    }
  };

  // Update stock for a specific batch
  const handleUpdateStock = (dishName, batchId, newRemaining) => {
    const item = stockData[dishName];
    const batch = item.batches.find(b => b.id === batchId);

    if (!batch) return;

    const soldAmount = batch.receivedPortions - newRemaining;
    const previousRemaining = batch.remainingPortions;
    const todayDate = new Date().toISOString().split('T')[0];

    // Update sales records - update existing or create new
    setSales(prev => {
      // Look for existing sales record for this batch
      const existingIndex = prev.findIndex(s =>
        s.batchNumber === batch.batchNumber &&
        s.location === selectedLocation &&
        s.date === todayDate &&
        !s.endOfDay
      );

      if (existingIndex >= 0) {
        // Update existing record
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          remainingPortions: newRemaining,
          soldPortions: soldAmount,
          timestamp: new Date().toISOString()
        };
        return updated;
      } else {
        // Create new record
        const saleRecord = {
          id: `sale-${batchId}-${Date.now()}`,
          location: selectedLocation,
          dishName: dishName,
          batchNumber: batch.batchNumber,
          date: todayDate,
          receivedPortions: batch.receivedPortions,
          remainingPortions: newRemaining,
          soldPortions: soldAmount,
          timestamp: new Date().toISOString(),
          endOfDay: false
        };
        return [...prev, saleRecord];
      }
    });

    // Update stock data locally for immediate UI feedback
    setStockData(prev => {
      const updatedBatches = prev[dishName].batches.map(b =>
        b.id === batchId ? { ...b, remainingPortions: newRemaining } : b
      );

      const totalRemaining = updatedBatches.reduce((sum, b) => sum + b.remainingPortions, 0);
      const totalSold = prev[dishName].receivedToday - updatedBatches
        .filter(b => !b.isOldStock)
        .reduce((sum, b) => sum + b.remainingPortions, 0);

      return {
        ...prev,
        [dishName]: {
          ...prev[dishName],
          remaining: totalRemaining,
          soldToday: totalSold,
          totalAvailable: totalRemaining,
          isLowStock: totalRemaining > 0 && totalRemaining <= 3,
          needsUrgentRestock: totalRemaining <= 3,
          batches: updatedBatches
        }
      };
    });

    // Save to database
    saveToDatabase && saveToDatabase('sales', {
      dish_name: dishName,
      location: selectedLocation,
      batch_number: batch.batchNumber,
      date: todayDate,
      received_portions: batch.receivedPortions,
      remaining_portions: newRemaining,
      sold_portions: soldAmount,
      timestamp: new Date().toISOString()
    });

    // Enhanced Alerts based on stock levels
    if (newRemaining === 0 && previousRemaining > 0) {
      // Out of stock alert
      alert(
        `🚨🚨 OUT OF STOCK ALERT 🚨🚨\n\n` +
        `${dishName} is now COMPLETELY OUT OF STOCK!\n\n` +
        `Location: ${selectedLocation}\n` +
        `Action Required:\n` +
        `1. CALL CENTRAL KITCHEN IMMEDIATELY\n` +
        `2. Check if more stock is being prepared\n` +
        `3. Inform customers about availability\n\n` +
        `📱 URGENT: Notify kitchen manager NOW!`
      );
    } else if (newRemaining <= 3 && newRemaining > 0 && previousRemaining > 3) {
      // Critical low stock alert
      alert(
        `⚠️ CRITICAL LOW STOCK WARNING ⚠️\n\n` +
        `${dishName} is CRITICALLY LOW!\n\n` +
        `Current Stock: ${newRemaining} portions only\n` +
        `Location: ${selectedLocation}\n\n` +
        `IMMEDIATE ACTIONS:\n` +
        `1. Notify Central Kitchen - PREPARE MORE\n` +
        `2. Manage customer expectations\n` +
        `3. Consider limiting portions per order\n\n` +
        `⏰ This item will run out soon!`
      );

      // Check total critical items
      const criticalCount = Object.values(stockData).filter(item =>
        item.dishName !== dishName && item.totalAvailable > 0 && item.totalAvailable <= 3
      ).length + 1;

      if (criticalCount >= 3) {
        setTimeout(() => {
          alert(
            `🔴 MULTIPLE ITEMS CRITICAL 🔴\n\n` +
            `${criticalCount} items are now critically low!\n` +
            `This requires IMMEDIATE kitchen attention.\n\n` +
            `📱 CALL KITCHEN MANAGER NOW!`
          );
        }, 500);
      }
    } else if (newRemaining <= 10 && newRemaining > 3 && previousRemaining > 10) {
      // Low stock warning
      console.log(`⚠️ Low Stock Warning: ${dishName} has ${newRemaining} portions remaining`);
    }

    // Check if old stock needs priority push
    if (item.oldStock > 0 && newRemaining < previousRemaining) {
      const oldStockPercentage = (item.oldStock / item.totalAvailable) * 100;
      if (oldStockPercentage > 50) {
        console.log(`📦 Reminder: ${dishName} has ${item.oldStock}p old stock - push for sale!`);
      }
    }
  };

  // Filter and search logic
  const getFilteredStock = () => {
    let filtered = Object.values(stockData);

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.dishName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by priority (items with old stock first, then by remaining stock)
    return filtered.sort((a, b) => {
      if (a.oldStock > 0 && b.oldStock === 0) return -1;
      if (b.oldStock > 0 && a.oldStock === 0) return 1;
      return b.remaining - a.remaining;
    });
  };

  const filteredStock = getFilteredStock();
  const categories = ['all', ...new Set(Object.values(dishCategories))];
  const currentShopStatus = shopStatus[selectedLocation];

  // Calculate statistics
  const stats = {
    totalItems: Object.keys(stockData).length,
    totalOldStock: Object.values(stockData).reduce((sum, item) => sum + item.oldStock, 0),
    totalReceived: Object.values(stockData).reduce((sum, item) => sum + item.receivedToday, 0),
    totalSold: Object.values(stockData).reduce((sum, item) => sum + item.soldToday, 0),
    totalAvailable: Object.values(stockData).reduce((sum, item) => sum + item.totalAvailable, 0),
    itemsWithOldStock: Object.values(stockData).filter(item => item.oldStock > 0).length,
    // Low stock items are those with 1-3 portions (excluding out of stock)
    lowStockItems: Object.values(stockData).filter(item => item.totalAvailable > 0 && item.totalAvailable <= 3).length,
    // Out of stock items are those with 0 portions that had received stock today
    outOfStockItems: Object.values(stockData).filter(item =>
      item.totalAvailable === 0 && (item.receivedToday > 0 || item.oldStock > 0)
    ).length,
    // Critical items include BOTH low stock (1-3) AND out of stock (0) items
    criticalItems: Object.values(stockData).filter(item =>
      (item.totalAvailable <= 3 && (item.receivedToday > 0 || item.oldStock > 0))
    ),
    oldStockDetails: Object.values(stockData)
      .filter(item => item.oldStock > 0)
      .map(item => ({ name: item.dishName, portions: item.oldStock }))
      .sort((a, b) => b.portions - a.portions)
      .slice(0, 5)
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <ShoppingCart className="mr-2" /> Sales & Stock Tracker
      </h2>

      {/* Shop Status Bar */}
      <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
        currentShopStatus?.isOpen
          ? 'bg-green-50 border-2 border-green-400'
          : 'bg-red-50 border-2 border-red-400'
      }`}>
        <div className="flex items-center space-x-4">
          <Store size={24} className={currentShopStatus?.isOpen ? 'text-green-600' : 'text-red-600'} />
          <div>
            <h3 className={`font-bold text-lg ${
              currentShopStatus?.isOpen ? 'text-green-800' : 'text-red-800'
            }`}>
              {selectedLocation} - {currentShopStatus?.isOpen ? 'OPEN' : 'CLOSED'}
            </h3>
            {currentShopStatus?.openTime && (
              <p className="text-sm text-gray-600">
                Opened at: {new Date(currentShopStatus.openTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {currentShopStatus?.isOpen ? (
          <button
            onClick={handleCloseShop}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center font-bold"
          >
            <Lock className="mr-2" size={20} />
            Close Shop
          </button>
        ) : (
          <button
            onClick={handleOpenShop}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-bold"
          >
            <Unlock className="mr-2" size={20} />
            Open Shop
          </button>
        )}
      </div>

      {/* CRITICAL ALERTS FOR CENTRAL KITCHEN - ALWAYS VISIBLE AT TOP */}
      <div className={`rounded-lg p-4 mb-6 ${
        (stats.criticalItems.length > 0 || stats.itemsWithOldStock > 0 || stats.outOfStockItems > 0)
          ? 'bg-red-50 border-2 border-red-400 animate-pulse'
          : 'bg-green-50 border-2 border-green-400'
      }`}>
        {(stats.criticalItems.length > 0 || stats.itemsWithOldStock > 0 || stats.outOfStockItems > 0) ? (
          <>
            <div className="flex items-center mb-3">
              <AlertTriangle className="text-red-600 mr-2 animate-bounce" size={28} />
              <h3 className="text-xl font-bold text-red-800">
                ⚠️ URGENT: CENTRAL KITCHEN ALERT - IMMEDIATE ACTION REQUIRED
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Critical Low Stock Items */}
              {stats.criticalItems.length > 0 && (
                <div className="bg-white border-2 border-red-400 rounded-lg p-3">
                  <h4 className="font-bold text-red-700 mb-2 text-lg">
                    🚨 CRITICAL / OUT OF STOCK
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {stats.criticalItems
                      .sort((a, b) => a.totalAvailable - b.totalAvailable)
                      .map(item => (
                      <div key={item.dishName} className={`p-2 rounded ${
                        item.totalAvailable === 0 ? 'bg-black text-white' : 'bg-red-100'
                      }`}>
                        <div className="flex justify-between">
                          <span className={`font-bold ${
                            item.totalAvailable === 0 ? 'text-white' : 'text-red-800'
                          }`}>
                            {item.dishName}
                          </span>
                          <span className={`font-bold text-lg ${
                            item.totalAvailable === 0 ? 'text-red-400' : 'text-red-900'
                          }`}>
                            {item.totalAvailable === 0 ? 'OUT!' : `${item.totalAvailable}p`}
                          </span>
                        </div>
                        {item.totalAvailable === 0 && item.soldToday > 0 && (
                          <div className="text-xs text-gray-300 mt-1">
                            Sold {item.soldToday}p today
                          </div>
                        )}
                        {item.oldStock > 0 && (
                          <div className={`text-xs mt-1 ${
                            item.totalAvailable === 0 ? 'text-orange-400' : 'text-orange-700'
                          }`}>
                            ⚠️ Includes {item.oldStock}p old stock
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-red-200 rounded text-xs font-bold text-red-900">
                    📱 CALL KITCHEN NOW: {stats.outOfStockItems} OUT | {stats.criticalItems.length - stats.outOfStockItems} CRITICAL
                  </div>
                </div>
              )}

              {/* Old Stock Priority */}
              {stats.oldStockDetails.length > 0 && (
                <div className="bg-white border-2 border-orange-400 rounded-lg p-3">
                  <h4 className="font-bold text-orange-700 mb-2 text-lg">
                    📦 OLD STOCK TO PUSH
                  </h4>
                  <div className="space-y-2">
                    {stats.oldStockDetails.map(item => (
                      <div key={item.name} className="bg-orange-100 p-2 rounded">
                        <div className="flex justify-between">
                          <span className="font-bold text-orange-800">{item.name}</span>
                          <span className="font-bold text-orange-900 text-lg">
                            {item.portions}p OLD
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2 bg-orange-200 rounded text-xs font-bold text-orange-900">
                    💰 CREATE OFFERS: 25-30% OFF NOW!
                  </div>
                </div>
              )}

              {/* Action Summary */}
              <div className="bg-white border-2 border-yellow-400 rounded-lg p-3">
                <h4 className="font-bold text-yellow-700 mb-2 text-lg">
                  📋 ACTION SUMMARY
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-yellow-100 p-2 rounded">
                    <div className="font-bold text-yellow-900">KITCHEN MUST:</div>
                    <ul className="text-yellow-800 text-xs mt-1">
                      <li>• Cook {stats.criticalItems.length} items ASAP</li>
                      <li>• Prepare for tomorrow dispatch</li>
                      <li>• Check expiry dates</li>
                    </ul>
                  </div>
                  <div className="bg-yellow-100 p-2 rounded">
                    <div className="font-bold text-yellow-900">SHOP MUST:</div>
                    <ul className="text-yellow-800 text-xs mt-1">
                      <li>• Push {stats.totalOldStock}p old stock</li>
                      <li>• Create special offers</li>
                      <li>• Update stock every 2 hours</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 p-2 bg-yellow-200 rounded text-xs font-bold text-yellow-900">
                  ⏰ UPDATE EVERY 2 HOURS
                </div>
              </div>
            </div>

            {/* Bottom Alert Bar */}
            <div className="mt-4 p-3 bg-red-200 rounded-lg flex items-center justify-between">
              <div className="text-sm font-bold text-red-900">
                📱 KITCHEN HOTLINE: {stats.outOfStockItems} OUT OF STOCK | {stats.criticalItems.length - stats.outOfStockItems} CRITICAL | {stats.totalOldStock}p OLD STOCK
              </div>
              <button
                onClick={() => {
                  const outOfStockItems = stats.criticalItems.filter(i => i.totalAvailable === 0);
                  const lowStockItems = stats.criticalItems.filter(i => i.totalAvailable > 0 && i.totalAvailable <= 3);

                  const message = `🚨🚨 URGENT UPDATE from ${selectedLocation} 🚨🚨\n\n` +
                    `⛔ OUT OF STOCK (0 portions):\n` +
                    `${outOfStockItems.length > 0 ? outOfStockItems.map(i => `• ${i.dishName}: COMPLETELY OUT!`).join('\n') : 'None'}\n\n` +
                    `⚠️ CRITICAL LOW (1-3 portions):\n` +
                    `${lowStockItems.length > 0 ? lowStockItems.map(i => `• ${i.dishName}: ${i.totalAvailable}p left`).join('\n') : 'None'}\n\n` +
                    `📦 OLD STOCK NEEDING SALE:\n` +
                    `Total: ${stats.totalOldStock} portions\n` +
                    `${stats.oldStockDetails.slice(0, 3).map(i => `• ${i.name}: ${i.portions}p`).join('\n')}\n\n` +
                    `🔴 ACTION REQUIRED NOW:\n` +
                    `1. Prepare OUT OF STOCK items IMMEDIATELY\n` +
                    `2. Cook critical items for tomorrow morning\n` +
                    `3. Create 30% OFF offers for old stock\n` +
                    `4. Dispatch first thing tomorrow\n\n` +
                    `Time: ${new Date().toLocaleTimeString()}\n` +
                    `Location: ${selectedLocation}`;
                  alert(message);
                  // In real app, this would send SMS/WhatsApp to kitchen
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-bold animate-pulse"
              >
                📲 NOTIFY KITCHEN NOW
              </button>
            </div>
          </>
        ) : (
          // All Good Status
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-600" size={24} />
              <div>
                <h3 className="font-bold text-green-800">✅ All Systems Normal - No Critical Alerts</h3>
                <p className="text-green-700 text-sm">
                  Stock levels are healthy. No immediate action required for Central Kitchen.
                </p>
              </div>
            </div>
            <div className="text-sm text-green-600">
              Last checked: {new Date().toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Location Selector and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Select Location</h3>
          <div className="grid grid-cols-2 gap-2">
            {['Eastham', 'Bethnal Green'].map(location => (
              <button
                key={location}
                onClick={() => setSelectedLocation(location)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedLocation === location
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <MapPin className="mx-auto mb-1" size={20} />
                <div className="font-medium">{location}</div>
                <div className="text-xs mt-1">
                  {shopStatus[location]?.isOpen ? '🟢 Open' : '🔴 Closed'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Compact Statistics - Focus on Critical Metrics */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Quick Stats - {selectedLocation}</h3>
          <div className="grid grid-cols-7 gap-2 text-center">
            <div className={`p-2 rounded ${stats.outOfStockItems > 0 ? 'bg-black text-white border-2 border-red-600' : 'bg-gray-50'}`}>
              <div className={`text-xl font-bold ${stats.outOfStockItems > 0 ? 'text-white animate-pulse' : 'text-gray-600'}`}>
                {stats.outOfStockItems}
              </div>
              <div className="text-xs">Out Stock</div>
            </div>
            <div className={`p-2 rounded ${stats.lowStockItems > 0 ? 'bg-red-100 border-2 border-red-400' : 'bg-gray-50'}`}>
              <div className={`text-xl font-bold ${stats.lowStockItems > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.lowStockItems}
              </div>
              <div className="text-xs text-gray-600">Low Stock</div>
            </div>
            <div className={`p-2 rounded ${stats.totalOldStock > 0 ? 'bg-orange-100 border-2 border-orange-400' : 'bg-gray-50'}`}>
              <div className={`text-xl font-bold ${stats.totalOldStock > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                {stats.totalOldStock}p
              </div>
              <div className="text-xs text-gray-600">Old Stock</div>
            </div>
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-xl font-bold text-blue-600">{stats.totalReceived}p</div>
              <div className="text-xs text-gray-600">Received</div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="text-xl font-bold text-green-600">{stats.totalSold}p</div>
              <div className="text-xs text-gray-600">Sold</div>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <div className="text-xl font-bold text-purple-600">{stats.totalAvailable}p</div>
              <div className="text-xs text-gray-600">Available</div>
            </div>
            <div className={`p-2 rounded ${
              stats.totalAvailable > 0 && ((stats.totalSold / (stats.totalSold + stats.totalAvailable)) * 100) >= 70
                ? 'bg-green-50'
                : 'bg-yellow-50'
            }`}>
              <div className={`text-xl font-bold ${
                stats.totalAvailable > 0 && ((stats.totalSold / (stats.totalSold + stats.totalAvailable)) * 100) >= 70
                  ? 'text-green-600'
                  : 'text-yellow-600'
              }`}>
                {stats.totalAvailable > 0 ? ((stats.totalSold / (stats.totalSold + stats.totalAvailable)) * 100).toFixed(0) : 0}%
              </div>
              <div className="text-xs text-gray-600">Sell Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Alerts for Central Kitchen */}
      {(stats.criticalItems.length > 0 || stats.itemsWithOldStock > 0) && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-3">
            <AlertTriangle className="text-red-600 mr-2" size={24} />
            <h3 className="text-lg font-bold text-red-800">⚠️ URGENT: Central Kitchen Alert</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Critical Low Stock Items */}
            {stats.criticalItems.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <h4 className="font-semibold text-red-700 mb-2">🚨 CRITICAL: Running Low (≤3 portions)</h4>
                <div className="space-y-1">
                  {stats.criticalItems.slice(0, 5).map(item => (
                    <div key={item.dishName} className="flex justify-between text-sm">
                      <span className="font-medium text-red-600">{item.dishName}</span>
                      <span className="font-bold text-red-700">
                        {item.totalAvailable}p left
                        {item.oldStock > 0 && (
                          <span className="text-orange-600 ml-2">({item.oldStock}p old)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t text-xs font-bold text-red-700">
                  ACTION: Prepare these items IMMEDIATELY for tomorrow!
                </div>
              </div>
            )}

            {/* Old Stock Details */}
            {stats.oldStockDetails.length > 0 && (
              <div className="bg-white rounded-lg p-3">
                <h4 className="font-semibold text-orange-700 mb-2">📦 Old Stock Priority List</h4>
                <div className="space-y-1">
                  {stats.oldStockDetails.map(item => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span className="font-medium text-orange-600">{item.name}</span>
                      <span className="font-bold text-orange-700">{item.portions}p old</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t text-xs font-bold text-orange-700">
                  ACTION: Push these items for sale TODAY! Consider offers.
                </div>
              </div>
            )}
          </div>

          {/* Summary Message */}
          <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
            <p className="text-sm font-semibold text-yellow-900">
              📱 NOTIFY CENTRAL KITCHEN:
              {stats.criticalItems.length > 0 && ` ${stats.criticalItems.length} items critically low.`}
              {stats.itemsWithOldStock > 0 && ` ${stats.totalOldStock} portions of old stock need priority sale.`}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>

          <button
            onClick={initializeStockData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dish / Batches
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Old Stock
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Received Today
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remaining
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sold Today
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Available
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredStock.map(item => (
              <React.Fragment key={item.dishName}>
                <tr className={`hover:bg-gray-50 ${
                  item.totalAvailable === 0 && item.receivedToday > 0 ? 'bg-black text-white' :
                  item.isLowStock ? 'bg-red-100 border-l-4 border-red-500' :
                  item.oldStock > 0 ? 'bg-orange-50' :
                  ''
                }`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <button
                        onClick={() => setExpandedItems(prev => ({
                          ...prev,
                          [item.dishName]: !prev[item.dishName]
                        }))}
                        className={`mr-2 hover:text-gray-700 ${
                          item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-white' : 'text-gray-500'
                        }`}
                      >
                        {expandedItems[item.dishName] ?
                          <ChevronUp size={16} /> :
                          <ChevronDown size={16} />
                        }
                      </button>
                      <div>
                        <div className={`font-medium ${
                          item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-white' : 'text-gray-900'
                        }`}>
                          {item.dishName}
                          {item.totalAvailable === 0 && item.receivedToday > 0 && (
                            <span className="ml-2 text-xs font-bold text-red-400 animate-pulse">⛔ OUT!</span>
                          )}
                          {item.isLowStock && item.totalAvailable > 0 && (
                            <span className="ml-2 text-xs font-bold text-red-600">⚠️ LOW</span>
                          )}
                        </div>
                        {item.batches.length > 0 && (
                          <div className={`text-xs ${
                            item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-gray-300' : 'text-gray-500'
                          }`}>
                            {item.batches.length} batch(es)
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.category === 'Biryani' ? 'bg-purple-100 text-purple-800' :
                      item.category === 'Curry' ? 'bg-blue-100 text-blue-800' :
                      item.category === 'Starters' ? 'bg-green-100 text-green-800' :
                      item.category === 'Sides' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.oldStock > 0 ? (
                      <span className={`font-bold ${
                        item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-orange-400' : 'text-orange-600'
                      }`}>{item.oldStock}p</span>
                    ) : (
                      <span className={item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-gray-400' : 'text-gray-400'}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.receivedToday > 0 ? (
                      <span className={`font-medium ${
                        item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-blue-400' : 'text-blue-600'
                      }`}>{item.receivedToday}p</span>
                    ) : (
                      <span className={item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-gray-400' : 'text-gray-400'}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${
                      item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-red-400 text-xl animate-pulse' :
                      item.remaining <= 3 && item.remaining > 0 ? 'text-red-600 text-lg' :
                      'text-purple-600'
                    }`}>
                      {item.remaining}p
                      {item.totalAvailable === 0 && item.receivedToday > 0 && (
                        <span className="block text-xs">⛔ OUT!</span>
                      )}
                      {item.remaining <= 3 && item.remaining > 0 && (
                        <span className="block text-xs">⚠️ RESTOCK</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.soldToday > 0 ? (
                      <span className={`font-medium ${
                        item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-green-400' : 'text-green-600'
                      }`}>{item.soldToday}p</span>
                    ) : (
                      <span className={item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-gray-400' : 'text-gray-400'}>-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold text-lg ${
                      item.totalAvailable === 0 && item.receivedToday > 0 ? 'text-red-400 animate-pulse' :
                      item.totalAvailable <= 3 && item.totalAvailable > 0 ? 'text-red-600' :
                      item.totalAvailable === 0 ? 'text-gray-400' :
                      'text-gray-900'
                    }`}>
                      {item.totalAvailable}p
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {currentShopStatus?.isOpen && item.totalAvailable > 0 && (
                      <button
                        onClick={() => setEditingStock(prev => ({
                          ...prev,
                          [item.dishName]: !prev[item.dishName]
                        }))}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Batch Details */}
                {expandedItems[item.dishName] && item.batches.length > 0 && (
                  <tr>
                    <td colSpan="8" className="px-4 py-3 bg-gray-50">
                      <div className="space-y-2">
                        <div className="text-sm font-semibold text-gray-700 mb-2">Batch Details:</div>
                        {item.batches.map(batch => {
                          const expiryStatus = getExpiryStatus(batch.expiryDate);
                          const isEditing = editingStock[`${item.dishName}-${batch.id}`];

                          return (
                            <div key={batch.id} className={`border rounded-lg p-3 ${
                              batch.isOldStock ? 'bg-orange-100 border-orange-300' :
                              expiryStatus.status === 'expired' ? 'bg-red-100 border-red-300' :
                              expiryStatus.status === 'urgent' ? 'bg-yellow-100 border-yellow-300' :
                              'bg-white border-gray-300'
                            }`}>
                              <div className="grid grid-cols-6 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Batch #:</span>
                                  <div className="font-mono font-bold text-purple-600">
                                    {batch.batchNumber}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Made:</span>
                                  <div>{new Date(batch.dateMade).toLocaleDateString()}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Received:</span>
                                  <div>{new Date(batch.dateReceived).toLocaleDateString()}</div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Expiry:</span>
                                  <div className={`font-medium text-${expiryStatus.color}-600`}>
                                    {new Date(batch.expiryDate).toLocaleDateString()}
                                    <span className="block text-xs">{expiryStatus.message}</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Stock:</span>
                                  <div className="flex items-center space-x-2">
                                    {isEditing ? (
                                      <>
                                        <input
                                          type="number"
                                          min="0"
                                          max={batch.receivedPortions}
                                          defaultValue={batch.remainingPortions}
                                          className="w-16 px-2 py-1 border rounded"
                                          id={`input-${batch.id}`}
                                        />
                                        <button
                                          onClick={() => {
                                            const input = document.getElementById(`input-${batch.id}`);
                                            handleUpdateStock(item.dishName, batch.id, parseInt(input.value));
                                            setEditingStock(prev => ({
                                              ...prev,
                                              [`${item.dishName}-${batch.id}`]: false
                                            }));
                                          }}
                                          className="text-green-600 hover:text-green-800"
                                        >
                                          <Save size={16} />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="font-bold">
                                          {batch.remainingPortions}/{batch.receivedPortions}p
                                        </span>
                                        {currentShopStatus?.isOpen && (
                                          <button
                                            onClick={() => setEditingStock(prev => ({
                                              ...prev,
                                              [`${item.dishName}-${batch.id}`]: true
                                            }))}
                                            className="text-blue-600 hover:text-blue-800"
                                          >
                                            <Edit2 size={14} />
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Chef:</span>
                                  <div>{batch.preparedBy}</div>
                                </div>
                              </div>
                              {batch.isOldStock && (
                                <div className="mt-2 text-xs font-bold text-orange-700">
                                  ⚠️ OLD STOCK - Prioritize selling this batch!
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {filteredStock.length === 0 && (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No items found</h3>
            <p className="text-gray-500">
              {searchQuery || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No stock data available for this location'}
            </p>
          </div>
        )}
      </div>

      {/* Old Stock Alert - Quick Summary Only */}
      {stats.totalOldStock > 0 && (
        <div className="mt-6 bg-orange-100 border border-orange-300 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="text-orange-600" size={20} />
              <span className="font-medium text-orange-800">
                Old Stock Summary: {stats.itemsWithOldStock} items | {stats.totalOldStock} portions
              </span>
            </div>
            <span className="text-sm text-orange-700">
              See details in Central Kitchen Alert above ↑
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSales;
