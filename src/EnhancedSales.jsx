import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  ShoppingCart, Package, AlertCircle, Clock, TrendingUp, MapPin,
  Search, X, CheckCircle, AlertTriangle, Store, Lock, Unlock,
  RefreshCw, Calendar, Hash, ChevronDown, ChevronUp, Edit2, Save,
  Snowflake, Thermometer
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

  // Shop Status Management - NO localStorage, use state or database
  const [shopStatus, setShopStatus] = useState({
    'Eastham': { isOpen: false, openTime: null, closeTime: null },
    'Bethnal Green': { isOpen: false, openTime: null, closeTime: null }
  });

  // Load shop status from database on mount
  useEffect(() => {
    loadShopStatusFromDatabase();
  }, []);

  const loadShopStatusFromDatabase = async () => {
    try {
      // Fetch shop status from database
      const { data, error } = await supabase
        .from('shop_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;

      if (data && data.length > 0) {
        const statusObj = {};
        data.forEach(record => {
          if (record.location) {
            statusObj[record.location] = {
              isOpen: record.is_open || false,
              openTime: record.open_time,
              closeTime: record.close_time
            };
          }
        });

        // Only update if we have valid data
        if (Object.keys(statusObj).length > 0) {
          setShopStatus(prev => ({ ...prev, ...statusObj }));
        }
      }
    } catch (error) {
      console.error('Error loading shop status:', error);
    }
  };

  const [selectedLocation, setSelectedLocation] = useState('Eastham');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedItems, setExpandedItems] = useState({});
  const [editingStock, setEditingStock] = useState({});
  const [stockData, setStockData] = useState({});
  const [batchStorageLocations, setBatchStorageLocations] = useState({}); // Track fridge/freezer for each batch

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
    'Raitha': 'Sides',
    'DEFAULT': 'Non-Food Items'

  };

  // Initialize stock data from sales and dispatch
  // Initialize stock data from sales and dispatch
  useEffect(() => {
    initializeStockData();
  }, [sales.length, dispatch.length, selectedLocation]); // Only re-run when data count changes

  const initializeStockData = () => {

    // ADD THESE DEBUG LINES
  console.log('=== SALES TRACKER DEBUG ===');
  console.log('All sales data:', sales);
  console.log('All dispatch data:', dispatch);
  console.log('Selected location:', selectedLocation);
  console.log('Today date:', new Date().toISOString().split('T')[0]);

    const allDishes = getDishNames();
    const locationStock = {};
    const todayDate = new Date().toISOString().split('T')[0];

    allDishes.forEach(dish => {
    const category = dishCategories[dish] || 'Non-Food Items';

      // Get all active batches for this dish at this location
      const activeBatches = [];
      const processedBatchNumbers = new Set();

      // 1. Get old stock (from previous day closings - not today)
      sales
        .filter(s =>
          s.location === selectedLocation &&
          s.dishName === dish &&
          s.endOfDay === true &&
          s.remainingPortions > 0 &&
          s.date !== todayDate // Exclude today's closings
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
              preparedBy: s.preparedBy || 'Previous Day',
              storageLocation: s.storageLocation || batchStorageLocations[batchNumber] || 'Fridge'
            });
          }
        });

      // 2. Get today's dispatched batches
      const todayDispatches = dispatch.filter(d =>
        d.dishName === dish &&
        d.date === todayDate &&
        ((selectedLocation === 'Eastham' && d.easthamSent > 0) ||
         (selectedLocation === 'Bethnal Green' && d.bethnalSent > 0))
      );

      // 3. Get today's sales updates to get current remaining
      const todaysSales = sales.filter(s =>
        s.location === selectedLocation &&
        s.dishName === dish &&
        s.date === todayDate &&
        !s.endOfDay
      );

      // ADD THIS NEW SECTION: Process non-food items
      const nonFoodItems = sales.filter(s =>
        s.location === selectedLocation &&
        s.date === todayDate &&
        (s.isNonFood === true || s.dispatchMode === 'inventory' || s.itemType !== 'food')
      );

      // Group non-food items by name
      const nonFoodGrouped = {};
      nonFoodItems.forEach(item => {
        if (!nonFoodGrouped[item.dishName]) {
          nonFoodGrouped[item.dishName] = {
            dishName: item.dishName,
            category: 'Non-Food Items',
            oldStock: 0,
            receivedToday: item.receivedPortions || 0,
            remaining: item.remainingPortions || 0,
            soldToday: (item.receivedPortions || 0) - (item.remainingPortions || 0),
            totalAvailable: item.remainingPortions || 0,
            batches: [{
              id: item.id,
              batchNumber: item.batchNumber || `NFI-${item.id}`,
              receivedPortions: item.receivedPortions || 0,
              remainingPortions: item.remainingPortions || 0,
              dateMade: item.dateMade || todayDate,
              dateReceived: todayDate,
              expiryDate: null, // Non-food items don't expire
              isOldStock: false,
              preparedBy: item.preparedBy || 'Inventory',
              storageLocation: 'Storage',
              itemType: item.itemType || 'non-food',
              dispatchMode: item.dispatchMode
            }],
            isLowStock: false,
            isOutOfStock: (item.remainingPortions || 0) === 0,
            needsUrgentRestock: false
          };
        } else {
          // Aggregate if same item appears multiple times
          nonFoodGrouped[item.dishName].receivedToday += (item.receivedPortions || 0);
          nonFoodGrouped[item.dishName].remaining += (item.remainingPortions || 0);
          nonFoodGrouped[item.dishName].totalAvailable += (item.remainingPortions || 0);
          nonFoodGrouped[item.dishName].soldToday += ((item.receivedPortions || 0) - (item.remainingPortions || 0));
        }
      });

      // Merge non-food items into locationStock
      Object.values(nonFoodGrouped).forEach(item => {
        locationStock[item.dishName] = item;
      });

const nonFoodSales = sales.filter(s =>
  s.location === selectedLocation &&
  s.date === todayDate &&
  !s.endOfDay &&
  (s.isNonFood === true || s.itemType !== 'food' || s.dispatchMode === 'inventory')
);

      // Process today's dispatches
      todayDispatches.forEach(d => {
        const portions = selectedLocation === 'Eastham' ? d.easthamSent : d.bethnalSent;
        const batchNumber = d.batchNumber || `BATCH-${d.id}`;

        if (processedBatchNumbers.has(batchNumber)) {
          return;
        }
        processedBatchNumbers.add(batchNumber);

        // Check if we have a sales update for this batch
        const salesUpdate = todaysSales.find(s => s.batchNumber === batchNumber);
        const remainingPortions = salesUpdate ? salesUpdate.remainingPortions : portions;

        // Find the prep log entry for this dispatch
        const prepEntry = prepLog.find(p =>
          p.batchNumber === batchNumber ||
          (p.dishName === dish && p.date === d.date && p.totalPortions === portions)
        );

        activeBatches.push({
          id: `${d.id}-${selectedLocation}`,
          batchNumber: batchNumber,
          receivedPortions: portions,
          remainingPortions: remainingPortions,
          dateMade: prepEntry?.dateMade || d.date,
          dateReceived: todayDate,
          expiryDate: prepEntry?.expiryDate || d.expiryDate ||
                     new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          isOldStock: false,
          preparedBy: prepEntry?.preparedBy || d.preparedBy || 'Kitchen',
          storageLocation: salesUpdate?.storageLocation || batchStorageLocations[batchNumber] || 'Fridge'
        });
      });

      // Sort batches by expiry date (FIFO)
      activeBatches.sort((a, b) => {
        // Old stock always comes first
        if (a.isOldStock && !b.isOldStock) return -1;
        if (!a.isOldStock && b.isOldStock) return 1;
        // Then by expiry date
        return new Date(a.expiryDate) - new Date(b.expiryDate);
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
        batches: activeBatches,
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
  const handleOpenShop = async () => {
    if (window.confirm(`Open ${selectedLocation} for business?`)) {
      const openTime = new Date().toISOString();

      const newStatus = {
        ...shopStatus,
        [selectedLocation]: {
          isOpen: true,
          openTime: openTime,
          closeTime: null
        }
      };
      setShopStatus(newStatus);

      // Save to database
      try {
        await supabase
          .from('shop_status')
          .insert({
            location: selectedLocation,
            is_open: true,
            open_time: openTime,
            action: 'shop_opened'
          });
      } catch (error) {
        console.error('Error saving shop status:', error);
      }

      alert(`✅ ${selectedLocation} is now OPEN for business!`);
    }
  };

  // Close Shop
  const handleCloseShop = async () => {
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
      const closeTime = new Date().toISOString();
      const closingEntries = [];

      Object.values(stockData).forEach(item => {
        if (item.remaining > 0) {
          item.batches.forEach(batch => {
            if (batch.remainingPortions > 0 && !batch.isOldStock) {
              closingEntries.push({
                id: `close-${batch.id}-${Date.now()}`,
                location: selectedLocation,
                dishName: item.dishName,
                batchNumber: batch.batchNumber,
                remainingPortions: batch.remainingPortions,
                endOfDay: true,
                date: todayDate,
                closedDate: todayDate,
                closedTime: new Date().toLocaleTimeString(),
                dateMade: batch.dateMade,
                expiryDate: batch.expiryDate,
                preparedBy: batch.preparedBy,
                storageLocation: batch.storageLocation // Preserve storage location
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
          closeTime: closeTime
        }
      };
      setShopStatus(newStatus);

      // Save to database
      try {
        await supabase
          .from('shop_status')
          .insert({
            location: selectedLocation,
            is_open: false,
            close_time: closeTime,
            action: 'shop_closed'
          });
      } catch (error) {
        console.error('Error saving shop status:', error);
      }

      alert(
        `✅ ${selectedLocation} CLOSED SUCCESSFULLY!\n\n` +
        `📊 Final Report:\n` +
        `• Sold Today: ${totalSold} portions\n` +
        `• Remaining Stock: ${totalRemaining} portions\n` +
        `• Stock has been marked as OLD STOCK for tomorrow`
      );
    }
  };

  // Update stock for a specific batch WITH FIFO LOGIC
  const handleUpdateStock = (dishName, batchId, newRemaining, newStorageLocation = null) => {
    const item = stockData[dishName];
    const batch = item.batches.find(b => b.id === batchId);

    if (!batch) return;

    // FIFO LOGIC: Check if there's old stock that must be sold first
    const oldStockBatches = item.batches.filter(b => b.isOldStock && b.remainingPortions > 0);
    const currentBatchIndex = item.batches.findIndex(b => b.id === batchId);
    const earlierBatches = item.batches.slice(0, currentBatchIndex).filter(b => b.remainingPortions > 0);

    // If trying to update a newer batch while older batches still have stock
    if (earlierBatches.length > 0 && newRemaining < batch.remainingPortions) {
      const oldestBatch = earlierBatches[0];
      alert(
        `⚠️ FIFO VIOLATION!\n\n` +
        `You must sell from the oldest batch first:\n` +
        `• Oldest Batch: ${oldestBatch.batchNumber}\n` +
        `• Remaining: ${oldestBatch.remainingPortions} portions\n` +
        `• Expiry: ${new Date(oldestBatch.expiryDate).toLocaleDateString()}\n\n` +
        `Please update the oldest batch first!`
      );
      return;
    }

    const soldAmount = batch.receivedPortions - newRemaining;
    const previousRemaining = batch.remainingPortions;
    const todayDate = new Date().toISOString().split('T')[0];

    // Update storage location if provided
    if (newStorageLocation) {
      setBatchStorageLocations(prev => ({
        ...prev,
        [batch.batchNumber]: newStorageLocation
      }));
    }

    // Update sales records
    setSales(prev => {
      const existingIndex = prev.findIndex(s =>
        s.batchNumber === batch.batchNumber &&
        s.location === selectedLocation &&
        s.date === todayDate &&
        !s.endOfDay
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          remainingPortions: newRemaining,
          soldPortions: soldAmount,
          storageLocation: newStorageLocation || updated[existingIndex].storageLocation,
          timestamp: new Date().toISOString()
        };
        return updated;
      } else {
        const saleRecord = {
          id: `sale-${batchId}-${Date.now()}`,
          location: selectedLocation,
          dishName: dishName,
          batchNumber: batch.batchNumber,
          date: todayDate,
          receivedPortions: batch.receivedPortions,
          remainingPortions: newRemaining,
          soldPortions: soldAmount,
          storageLocation: newStorageLocation || batch.storageLocation || 'Fridge',
          timestamp: new Date().toISOString(),
          endOfDay: false
        };
        return [...prev, saleRecord];
      }
    });

    // Update stock data locally
    setStockData(prev => {
      const updatedBatches = prev[dishName].batches.map(b =>
        b.id === batchId ? {
          ...b,
          remainingPortions: newRemaining,
          storageLocation: newStorageLocation || b.storageLocation
        } : b
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
      storage_location: newStorageLocation || batch.storageLocation,
      timestamp: new Date().toISOString()
    });

    // Stock level alerts
    if (newRemaining === 0 && previousRemaining > 0) {
      alert(
        `🚨🚨 OUT OF STOCK ALERT 🚨🚨\n\n` +
        `${dishName} batch ${batch.batchNumber} is now EMPTY!\n` +
        `Location: ${selectedLocation}\n` +
        `Storage: ${batch.storageLocation}`
      );
    } else if (newRemaining <= 3 && newRemaining > 0 && previousRemaining > 3) {
      alert(
        `⚠️ LOW STOCK WARNING ⚠️\n\n` +
        `${dishName} batch ${batch.batchNumber} is LOW!\n` +
        `Remaining: ${newRemaining} portions\n` +
        `Storage: ${batch.storageLocation}`
      );
    }
  };

  // Filter and search logic
  const getFilteredStock = () => {
    let filtered = Object.values(stockData);

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.dishName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      if (a.oldStock > 0 && b.oldStock === 0) return -1;
      if (b.oldStock > 0 && a.oldStock === 0) return 1;
      return b.remaining - a.remaining;
    });
  };

  const filteredStock = getFilteredStock();
  const categories = ['all', ...new Set([...Object.values(dishCategories), 'Non-Food Items'])];
  const currentShopStatus = shopStatus[selectedLocation];

  // Calculate statistics
  const stats = {
    totalItems: Object.keys(stockData).length,
    totalOldStock: Object.values(stockData).reduce((sum, item) => sum + item.oldStock, 0),
    totalReceived: Object.values(stockData).reduce((sum, item) => sum + item.receivedToday, 0),
    totalSold: Object.values(stockData).reduce((sum, item) => sum + item.soldToday, 0),
    totalAvailable: Object.values(stockData).reduce((sum, item) => sum + item.totalAvailable, 0),
    itemsWithOldStock: Object.values(stockData).filter(item => item.oldStock > 0).length,
    lowStockItems: Object.values(stockData).filter(item => item.totalAvailable > 0 && item.totalAvailable <= 3).length,
    outOfStockItems: Object.values(stockData).filter(item =>
      item.totalAvailable === 0 && (item.receivedToday > 0 || item.oldStock > 0)
    ).length,
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
        <ShoppingCart className="mr-2" /> Sales & Stock Tracker with FIFO
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

        {/* Statistics */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Quick Stats - {selectedLocation}</h3>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className={`p-2 rounded ${stats.outOfStockItems > 0 ? 'bg-red-100' : 'bg-gray-50'}`}>
              <div className="text-xl font-bold">{stats.outOfStockItems}</div>
              <div className="text-xs">Out Stock</div>
            </div>
            <div className="bg-orange-50 p-2 rounded">
              <div className="text-xl font-bold text-orange-600">{stats.totalOldStock}p</div>
              <div className="text-xs">Old Stock</div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="text-xl font-bold text-green-600">{stats.totalSold}p</div>
              <div className="text-xs">Sold</div>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <div className="text-xl font-bold text-purple-600">{stats.totalAvailable}p</div>
              <div className="text-xs">Available</div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Stock Table with Storage Location */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dish / Batches
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Storage
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Old Stock
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Received
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remaining
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sold
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
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
                  item.totalAvailable === 0 ? 'bg-red-50' :
                  item.isLowStock ? 'bg-orange-50' :
                  item.oldStock > 0 ? 'bg-yellow-50' :
                  ''
                }`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <button
                        onClick={() => setExpandedItems(prev => ({
                          ...prev,
                          [item.dishName]: !prev[item.dishName]
                        }))}
                        className="mr-2"
                      >
                        {expandedItems[item.dishName] ?
                          <ChevronUp size={16} /> :
                          <ChevronDown size={16} />
                        }
                      </button>
                      <div>
                        <div className="font-medium">{item.dishName}</div>
                        {item.batches.length > 0 && (
                          <div className="text-xs text-gray-500">
                            {item.batches.length} batch(es)
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {/* Show storage icons for batches */}
                    <div className="flex justify-center space-x-1">
                      {item.batches.map(batch => (
                        <span key={batch.id} title={`Batch ${batch.batchNumber}: ${batch.storageLocation}`}>
                          {batch.storageLocation === 'Freezer' ?
                            <Snowflake size={16} className="text-blue-500" /> :
                            <Thermometer size={16} className="text-orange-500" />
                          }
                        </span>
                      )).slice(0, 3)}
                      {item.batches.length > 3 && (
                        <span className="text-xs text-gray-500">+{item.batches.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.oldStock > 0 ? (
                      <span className="font-bold text-orange-600">{item.oldStock}p</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.receivedToday > 0 ? (
                      <span className="font-medium text-blue-600">{item.receivedToday}p</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${
                      item.remaining === 0 ? 'text-red-600' :
                      item.remaining <= 3 ? 'text-orange-600' :
                      'text-purple-600'
                    }`}>
                      {item.remaining}p
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.soldToday > 0 ? (
                      <span className="font-medium text-green-600">{item.soldToday}p</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-lg">{item.totalAvailable}p</span>
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
                        <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                          Batch Details (FIFO - Sell oldest first):
                          <span className="ml-2 text-xs text-red-600 font-normal">
                            ⚠️ Must sell in order shown
                          </span>
                        </div>
                        {item.batches.map((batch, index) => {
                          const expiryStatus = getExpiryStatus(batch.expiryDate);
                          const isEditing = editingStock[`${item.dishName}-${batch.id}`];
                          const canEdit = index === 0 || item.batches[index - 1].remainingPortions === 0;

                          return (
                            <div key={batch.id} className={`border rounded-lg p-3 ${
                              batch.isOldStock ? 'bg-orange-100 border-orange-300' :
                              expiryStatus.status === 'expired' ? 'bg-red-100 border-red-300' :
                              expiryStatus.status === 'urgent' ? 'bg-yellow-100 border-yellow-300' :
                              'bg-white border-gray-300'
                            } ${!canEdit && currentShopStatus?.isOpen ? 'opacity-50' : ''}`}>
                              <div className="grid grid-cols-8 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Order:</span>
                                  <div className="font-bold text-lg">#{index + 1}</div>
                                  {index === 0 && <span className="text-xs text-green-600">SELL FIRST</span>}
                                </div>
                                <div>
                                  <span className="text-gray-500">Batch #:</span>
                                  <div className="font-mono font-bold text-purple-600">
                                    {batch.batchNumber}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Storage:</span>
                                  <div className="flex items-center space-x-1">
                                    {isEditing ? (
                                      <select
                                        defaultValue={batch.storageLocation}
                                        className="px-2 py-1 border rounded text-sm"
                                        id={`storage-${batch.id}`}
                                      >
                                        <option value="Fridge">Fridge</option>
                                        <option value="Freezer">Freezer</option>
                                      </select>
                                    ) : (
                                      <div className="flex items-center">
                                        {batch.storageLocation === 'Freezer' ?
                                          <Snowflake size={16} className="text-blue-500 mr-1" /> :
                                          <Thermometer size={16} className="text-orange-500 mr-1" />
                                        }
                                        <span className="font-medium">{batch.storageLocation}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-gray-500">Made:</span>
                                  <div>{new Date(batch.dateMade).toLocaleDateString()}</div>
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
                                            const storageSelect = document.getElementById(`storage-${batch.id}`);
                                            handleUpdateStock(
                                              item.dishName,
                                              batch.id,
                                              parseInt(input.value),
                                              storageSelect.value
                                            );
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
                                        {currentShopStatus?.isOpen && canEdit && (
                                          <button
                                            onClick={() => setEditingStock(prev => ({
                                              ...prev,
                                              [`${item.dishName}-${batch.id}`]: true
                                            }))}
                                            className="text-blue-600 hover:text-blue-800"
                                            title={canEdit ? "Edit stock" : "Sell earlier batches first"}
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
                                <div>
                                  {batch.isOldStock && (
                                    <span className="px-2 py-1 bg-orange-600 text-white rounded text-xs">
                                      OLD STOCK
                                    </span>
                                  )}
                                  {!canEdit && currentShopStatus?.isOpen && (
                                    <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs">
                                      LOCKED
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                          <strong>FIFO Rule:</strong> You must sell batches in order. Complete batch #1 before updating batch #2.
                        </div>
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
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSales;
