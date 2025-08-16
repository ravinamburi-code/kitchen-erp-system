import React, { useState, useEffect } from 'react';
import { Truck, Plus, X, ChefHat, AlertCircle, Clock, Package, Calendar, Snowflake, Box } from 'lucide-react';

const EnhancedDispatch = ({
  dispatch = [],
  setDispatch,
  prepLog = [],
  setPrepLog,
  sales = [],
  setSales,
  calculateDishCost,
  getAllDishNames,
  saveToDatabase,
  inventory = []
}) => {

  console.log('=== DISPATCH COMPONENT DEBUG ===');
 console.log('Inventory prop received:', inventory);
 console.log('Inventory length:', inventory?.length);
 console.log('First inventory item:', inventory?.[0]);
 // Then check specifically for Miscellaneous items
  if (inventory && inventory.length > 0) {
    const miscItems = inventory.filter(item => item.category === 'Miscellaneous');
    console.log('Items with Miscellaneous category:', miscItems);

    // Also show all unique categories
    const allCategories = [...new Set(inventory.map(item => item.category))];
    console.log('All unique categories in inventory:', allCategories);
  }
  // State for dispatch mode
  const [dispatchMode, setDispatchMode] = useState('prep'); // 'prep', 'coldroom', 'manual', 'inventory'

  // State for cold room inventory
  const [coldRoomStock, setColdRoomStock] = useState({});

  const [newDispatchEntry, setNewDispatchEntry] = useState({
    dishName: '',
    totalCooked: '',
    easthamSent: '',
    bethnalSent: '',
    coldRoomStock: '',
    batchNumber: '',
    expiryDate: '',
    dateMade: '',
    preparedBy: '',
    containerSize: '',
    dispatchType: 'prep', // 'prep', 'coldroom', 'manual', 'inventory'
    itemType: 'food' // 'food', 'container', 'label', 'other'
  });

  // Calculate cold room stock on mount and when dispatch changes
  useEffect(() => {
    calculateColdRoomInventory();
  }, [dispatch, prepLog]);

  // Calculate actual cold room inventory
  const calculateColdRoomInventory = () => {
    const coldRoomItems = {};

    // Add items from dispatch cold room stock
    if (dispatch && Array.isArray(dispatch)) {
      dispatch.forEach(d => {
        if (d.coldRoomStock > 0 && d.dispatchType !== 'coldroom') {
          if (!coldRoomItems[d.dishName]) {
            coldRoomItems[d.dishName] = {
              totalPortions: 0,
              batches: []
            };
          }
          coldRoomItems[d.dishName].totalPortions += d.coldRoomStock;
          if (d.batchNumber) {
            coldRoomItems[d.dishName].batches.push({
              batchNumber: d.batchNumber,
              portions: d.coldRoomStock,
              expiryDate: d.expiryDate,
              dateMade: d.dateMade,
              preparedBy: d.preparedBy,
              containerSize: d.containerSize
            });
          }
        }
      });

      // Subtract items dispatched from cold room
      dispatch.forEach(d => {
        if (d.dispatchType === 'coldroom' && d.dishName) {
          const totalDispatched = (d.easthamSent || 0) + (d.bethnalSent || 0);
          if (coldRoomItems[d.dishName]) {
            coldRoomItems[d.dishName].totalPortions = Math.max(0,
              coldRoomItems[d.dishName].totalPortions - totalDispatched
            );
          }
        }
      });
    }

    setColdRoomStock(coldRoomItems);
    return coldRoomItems;
  };

  // Get available cold room stock for a dish
  const getColdRoomStockForDish = (dishName) => {
    if (!dishName) return 0;
    return coldRoomStock[dishName]?.totalPortions || 0;
  };

  // Get batch info for cold room item
  const getColdRoomBatchInfo = (dishName) => {
    // Find the most recent batch info for this dish in cold room
    if (!dispatch || !Array.isArray(dispatch)) return null;

    const relevantDispatch = dispatch
      .filter(d => d.dishName === dishName && d.coldRoomStock > 0 && d.dispatchType !== 'coldroom')
      .sort((a, b) => new Date(b.dispatchTime) - new Date(a.dispatchTime))[0];

    if (relevantDispatch) {
      return {
        batchNumber: relevantDispatch.batchNumber,
        expiryDate: relevantDispatch.expiryDate,
        dateMade: relevantDispatch.dateMade,
        preparedBy: relevantDispatch.preparedBy,
        containerSize: relevantDispatch.containerSize
      };
    }

    return null;
  };

  // Calculate time until expiry
  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', message: 'No expiry', color: 'gray' };

    const now = new Date();
    const expiry = new Date(expiryDate);
    const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);

    if (hoursUntilExpiry < 0) {
      return { status: 'expired', message: 'EXPIRED', color: 'red' };
    } else if (hoursUntilExpiry < 24) {
      return { status: 'urgent', message: `${Math.floor(hoursUntilExpiry)}h left`, color: 'orange' };
    } else if (hoursUntilExpiry < 48) {
      return { status: 'warning', message: `${Math.floor(hoursUntilExpiry / 24)}d left`, color: 'yellow' };
    } else {
      return { status: 'good', message: `${Math.floor(hoursUntilExpiry / 24)}d left`, color: 'green' };
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Select prep item and auto-fill dispatch form
  const selectPrepItem = (prepItem) => {
    const coldRoomAvailable = getColdRoomStockForDish(prepItem.dishName);

    setNewDispatchEntry({
      dishName: prepItem.dishName,
      totalCooked: prepItem.totalPortions.toString(),
      easthamSent: Math.ceil(prepItem.totalPortions * 0.4).toString(),
      bethnalSent: Math.ceil(prepItem.totalPortions * 0.35).toString(),
      coldRoomStock: Math.floor(prepItem.totalPortions * 0.25).toString(),
      batchNumber: prepItem.batchNumber || '',
      expiryDate: prepItem.expiryDate || '',
      dateMade: prepItem.dateMade || prepItem.timestamp || prepItem.date,
      preparedBy: prepItem.preparedBy || '',
      containerSize: prepItem.containerSize || '',
      prepId: prepItem.id,
      dispatchType: 'prep',
      itemType: 'food'
    });

    setDispatchMode('prep');
    document.querySelector('.dispatch-form')?.scrollIntoView({ behavior: 'smooth' });

    const expiryStatus = getExpiryStatus(prepItem.expiryDate);

    let alertMessage = `✅ Auto-filled dispatch form for ${prepItem.dishName}!\n\n` +
          `📦 Batch: ${prepItem.batchNumber || 'N/A'}\n` +
          `⏰ Expiry: ${expiryStatus.message} (${formatDate(prepItem.expiryDate)})\n`;

    if (coldRoomAvailable > 0) {
      alertMessage += `\n❄️ COLD ROOM STOCK: ${coldRoomAvailable} portions available!\n` +
                      `Consider dispatching from cold room first (FIFO).\n\n`;
    }

    alertMessage += `📊 Suggested Distribution:\n` +
          `• Eastham: ${Math.ceil(prepItem.totalPortions * 0.4)}p\n` +
          `• Bethnal Green: ${Math.ceil(prepItem.totalPortions * 0.35)}p\n` +
          `• Cold Room: ${Math.floor(prepItem.totalPortions * 0.25)}p\n\n` +
          `👆 You can adjust these numbers before dispatching!`;

    alert(alertMessage);
  };

  // Handle dispatch submission
  const handleDispatchSubmit = async () => {

    if (!newDispatchEntry.dishName) {
      alert('❌ Please select a dish or item name');
      return;
    }

    if (!newDispatchEntry.totalCooked && dispatchMode !== 'coldroom') {
      alert('❌ Please enter total quantity');
      return;
    }

    const eastham = parseInt(newDispatchEntry.easthamSent) || 0;
    const bethnal = parseInt(newDispatchEntry.bethnalSent) || 0;
    const coldRoom = parseInt(newDispatchEntry.coldRoomStock) || 0;
    const total = parseInt(newDispatchEntry.totalCooked) || (eastham + bethnal + coldRoom);

    // For cold room dispatch, validate against available stock
    if (dispatchMode === 'coldroom') {
      const availableStock = getColdRoomStockForDish(newDispatchEntry.dishName);
      const totalRequested = eastham + bethnal;

      if (totalRequested === 0) {
        alert('❌ Please specify quantities for at least one location');
        return;
      }

      if (totalRequested > availableStock) {
        alert(`❌ Cannot dispatch ${totalRequested} portions!\nOnly ${availableStock} portions available in cold room for ${newDispatchEntry.dishName}`);
        return;
      }
    } else {
      // For other modes, check distribution
      if (eastham + bethnal + coldRoom !== total) {
        alert(`❌ Invalid Distribution! Total: ${total}, but sum is ${eastham + bethnal + coldRoom}`);
        return;
      }
    }

    // Find batch info for cold room dispatch
    let batchInfo = {
      batchNumber: newDispatchEntry.batchNumber || `M-${Date.now()}`,
      expiryDate: newDispatchEntry.expiryDate,
      dateMade: newDispatchEntry.dateMade || new Date().toISOString(),
      preparedBy: newDispatchEntry.preparedBy || 'Direct Dispatch',
      containerSize: newDispatchEntry.containerSize
    };

    if (dispatchMode === 'coldroom') {
      const coldRoomBatchInfo = getColdRoomBatchInfo(newDispatchEntry.dishName);
      if (coldRoomBatchInfo) {
        batchInfo = coldRoomBatchInfo;
      }
    }

    const newEntry = {
      id: dispatch && dispatch.length > 0 ? Math.max(...dispatch.map(d => d.id)) + 1 : 1,
  date: new Date().toISOString().split('T')[0], // Make sure this is TODAY
      dispatchTime: new Date().toISOString(),
      dishName: newDispatchEntry.dishName,
      totalCooked: dispatchMode === 'coldroom' ? (eastham + bethnal) : total,
      easthamSent: eastham,
      bethnalSent: bethnal,
      coldRoomStock: dispatchMode === 'coldroom' ? 0 : coldRoom,
      batchNumber: batchInfo.batchNumber,
      expiryDate: batchInfo.expiryDate,
      dateMade: batchInfo.dateMade,
      preparedBy: batchInfo.preparedBy,
      containerSize: batchInfo.containerSize,
      dispatchType: dispatchMode,
      itemType: newDispatchEntry.itemType
    };

    // Save to database
    const dbEntry = {
      dish_name: newEntry.dishName,
      date: new Date().toISOString().split('T')[0], // ADD THIS LINE

      total_cooked: newEntry.totalCooked,
      eastham_sent: newEntry.easthamSent,
      bethnal_sent: newEntry.bethnalSent,
      cold_room_stock: newEntry.coldRoomStock,
      batch_number: newEntry.batchNumber,
      expiry_date: newEntry.expiryDate,
      date_made: newEntry.dateMade,
      prepared_by: newEntry.preparedBy,
      container_size: newEntry.containerSize,
      dispatch_time: newEntry.dispatchTime,
      dispatch_type: newEntry.dispatchType,
      item_type: newEntry.itemType
    };

    if (saveToDatabase && typeof saveToDatabase === 'function') {
      await saveToDatabase('dispatch', dbEntry);
    }
    // Create sales entries for locations
    if (eastham > 0) {
      const easthamSalesEntry = {
        id: sales && sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 100 : 100,
        dishName: newDispatchEntry.dishName,
        location: 'Eastham',
        receivedPortions: eastham,
        remainingPortions: eastham,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        updatedBy: 'Auto-Created from Dispatch',
        autoCreated: true,
        batchNumber: batchInfo.batchNumber,
        expiryDate: batchInfo.expiryDate,
        dateMade: batchInfo.dateMade,
        preparedBy: batchInfo.preparedBy,
        containerSize: batchInfo.containerSize,
        itemType: newEntry.itemType,
        dispatchMode: dispatchMode,
        fromColdRoom: dispatchMode === 'coldroom',
        isNonFood: dispatchMode === 'inventory',
        isManualEntry: dispatchMode === 'manual'
      };

      if (saveToDatabase && typeof saveToDatabase === 'function') {
        await saveToDatabase('sales', {
          dish_name: easthamSalesEntry.dishName,
          location: easthamSalesEntry.location,
          received_portions: easthamSalesEntry.receivedPortions,
          remaining_portions: easthamSalesEntry.remainingPortions,
          date: easthamSalesEntry.date,  // <-- ADD THIS LINE - CRITICAL!
          updated_by: easthamSalesEntry.updatedBy,
          auto_created: true,
          batch_number: easthamSalesEntry.batchNumber,
          expiry_date: easthamSalesEntry.expiryDate,
          date_made: easthamSalesEntry.dateMade,
          prepared_by: easthamSalesEntry.preparedBy,
          container_size: easthamSalesEntry.containerSize,
          item_type: easthamSalesEntry.itemType,
          dispatch_mode: dispatchMode,
          from_cold_room: dispatchMode === 'coldroom',
          is_non_food: dispatchMode === 'inventory',
          is_manual_entry: dispatchMode === 'manual'
        });
      }

      setSales && setSales(prev => [...prev, easthamSalesEntry]);
    }

    if (bethnal > 0) {
      const bethnalSalesEntry = {
        id: sales && sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 200 : 200,
        dishName: newDispatchEntry.dishName,
        location: 'Bethnal Green',
        receivedPortions: bethnal,
        remainingPortions: bethnal,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        updatedBy: 'Auto-Created from Dispatch',
        autoCreated: true,
        batchNumber: batchInfo.batchNumber,
        expiryDate: batchInfo.expiryDate,
        dateMade: batchInfo.dateMade,
        preparedBy: batchInfo.preparedBy,
        containerSize: batchInfo.containerSize,
        itemType: newEntry.itemType,
        dispatchMode: dispatchMode,
        fromColdRoom: dispatchMode === 'coldroom',
        isNonFood: dispatchMode === 'inventory',
        isManualEntry: dispatchMode === 'manual'
      };

      if (saveToDatabase && typeof saveToDatabase === 'function') {
        await saveToDatabase('sales', {
          dish_name: bethnalSalesEntry.dishName,
          location: bethnalSalesEntry.location,
          received_portions: bethnalSalesEntry.receivedPortions,
          remaining_portions: bethnalSalesEntry.remainingPortions,
          date: bethnalSalesEntry.date,  // <-- ADD THIS LINE - CRITICAL!
          updated_by: bethnalSalesEntry.updatedBy,
          auto_created: true,
          batch_number: bethnalSalesEntry.batchNumber,
          expiry_date: bethnalSalesEntry.expiryDate,
          date_made: bethnalSalesEntry.dateMade,
          prepared_by: bethnalSalesEntry.preparedBy,
          container_size: bethnalSalesEntry.containerSize,
          item_type: bethnalSalesEntry.itemType,
          dispatch_mode: dispatchMode,
          from_cold_room: dispatchMode === 'coldroom',
          is_non_food: dispatchMode === 'inventory',
          is_manual_entry: dispatchMode === 'manual'
        });
      }

      setSales && setSales(prev => [...prev, bethnalSalesEntry]);
    }
    // Mark prep item as processed if from prep
    if (dispatchMode === 'prep' && newDispatchEntry.prepId && setPrepLog) {
      setPrepLog(prev => prev.map(p =>
        p.id === newDispatchEntry.prepId ? { ...p, processed: true } : p
      ));
    }

    // Update dispatch and immediately recalculate cold room inventory
    if (setDispatch) {
      setDispatch(prev => {
        const updatedDispatch = [...prev, newEntry];
        // Force immediate recalculation
        setTimeout(() => calculateColdRoomInventory(), 0);
        return updatedDispatch;
      });
    }

    // Reset form
    setNewDispatchEntry({
      dishName: '',
      totalCooked: '',
      easthamSent: '',
      bethnalSent: '',
      coldRoomStock: '',
      batchNumber: '',
      expiryDate: '',
      dateMade: '',
      preparedBy: '',
      containerSize: '',
      dispatchType: 'prep',
      itemType: 'food'
    });

    let successMessage = `✅ Successfully dispatched!\n\n`;
    successMessage += `📦 Item: ${newEntry.dishName}\n`;
    successMessage += `🏷️ Batch: ${newEntry.batchNumber}\n`;
    successMessage += `📍 Eastham: ${eastham}${newEntry.itemType === 'food' ? 'p' : ' units'}\n`;
    successMessage += `📍 Bethnal Green: ${bethnal}${newEntry.itemType === 'food' ? 'p' : ' units'}\n`;

    if (dispatchMode !== 'coldroom') {
      successMessage += `❄️ To Cold Room: ${coldRoom}${newEntry.itemType === 'food' ? 'p' : ' units'}\n`;
    }

    alert(successMessage);
  };

  // Sort prep items by expiry
  const sortedPrepItems = (prepLog && Array.isArray(prepLog) ? prepLog : [])
    .filter(prep => !prep.processed)
    .sort((a, b) => {
      const statusA = getExpiryStatus(a.expiryDate);
      const statusB = getExpiryStatus(b.expiryDate);

      const priorityOrder = { expired: 0, urgent: 1, warning: 2, good: 3, unknown: 4 };
      return priorityOrder[statusA.status] - priorityOrder[statusB.status];
    });

    const getDispatchableInventoryItems = () => {
      if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
        return [];
      }

      const miscItems = inventory.filter(item => {
        return item.category === 'Miscellaneous';
      });

      return miscItems.map(item => {
        // Use the closingBalance if it exists, otherwise calculate it
        let currentStock;

        if (item.closingBalance !== undefined) {
          currentStock = parseFloat(item.closingBalance);
        } else {
          // Fallback calculation if closingBalance doesn't exist
          const openingStock = parseFloat(item.openingStock || 0);
          const receivedThisWeek = parseFloat(item.receivedThisWeek || 0);
          const usedThisWeek = parseFloat(item.usedThisWeek || 0);
          currentStock = openingStock + receivedThisWeek - usedThisWeek;
        }

        return {
          name: item.name,
          unit: item.unit || 'pieces',
          category: item.category,
          currentStock: currentStock,
          id: item.id
        };
      });
    };
  // Call the function to get items
  const dispatchableInventoryItems = getDispatchableInventoryItems();


  // If no inventory items, show message instead of hardcoded items
  const hasInventoryItems = dispatchableInventoryItems.length > 0;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Truck className="mr-2" /> Advanced Dispatch Management
      </h2>

      {/* Cold Room Stock Alert */}
      {Object.keys(coldRoomStock).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
            <Snowflake className="mr-2" /> ❄️ Current Cold Room Stock
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(coldRoomStock).map(([dishName, stock]) =>
              stock.totalPortions > 0 && (
                <div key={dishName} className="bg-white p-3 rounded border border-blue-300">
                  <div className="font-medium">{dishName}</div>
                  <div className="text-2xl font-bold text-blue-600">{stock.totalPortions}p</div>
                  <div className="text-xs text-gray-600">
                    {stock.batches.length} batch(es) in cold room
                  </div>
                  <button
                    onClick={() => {
                      setDispatchMode('coldroom');
                      const batchInfo = getColdRoomBatchInfo(dishName);
                      setNewDispatchEntry(prev => ({
                        ...prev,
                        dishName,
                        dispatchType: 'coldroom',
                        totalCooked: stock.totalPortions.toString(),
                        ...(batchInfo || {})
                      }));
                    }}
                    className="mt-2 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Dispatch from Cold Room
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Dispatch Mode Selector */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Select Dispatch Mode</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button
            onClick={() => setDispatchMode('prep')}
            className={`p-3 rounded-lg border-2 transition-all ${
              dispatchMode === 'prep'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <ChefHat className="mx-auto mb-2" size={24} />
            <div className="font-medium">From Prep Log</div>
            <div className="text-xs mt-1">Dispatch freshly prepared items</div>
          </button>

          <button
            onClick={() => setDispatchMode('coldroom')}
            className={`p-3 rounded-lg border-2 transition-all ${
              dispatchMode === 'coldroom'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Snowflake className="mx-auto mb-2" size={24} />
            <div className="font-medium">From Cold Room</div>
            <div className="text-xs mt-1">Dispatch existing cold stock</div>
          </button>

          <button
            onClick={() => setDispatchMode('manual')}
            className={`p-3 rounded-lg border-2 transition-all ${
              dispatchMode === 'manual'
                ? 'border-purple-500 bg-purple-50 text-purple-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Package className="mx-auto mb-2" size={24} />
            <div className="font-medium">Manual Entry</div>
            <div className="text-xs mt-1">Dispatch any food item</div>
          </button>

          <button
            onClick={() => setDispatchMode('inventory')}
            className={`p-3 rounded-lg border-2 transition-all ${
              dispatchMode === 'inventory'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <Box className="mx-auto mb-2" size={24} />
            <div className="font-medium">Non-Food Items</div>
            <div className="text-xs mt-1">Containers, labels, etc.</div>
          </button>
        </div>
      </div>

      {/* Conditional Content Based on Mode */}
      {dispatchMode === 'prep' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-green-800">📋 Ready for Dispatch (From Prep Log)</h3>
          <p className="text-sm text-green-700 mb-3">Items sorted by expiry urgency. Click to auto-fill dispatch form.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedPrepItems.length > 0 ? (
              sortedPrepItems.map(prep => {
                const expiryStatus = getExpiryStatus(prep.expiryDate);
                const coldRoomAvailable = getColdRoomStockForDish(prep.dishName);

                return (
                  <div
                    key={`prep-${prep.id}`}
                    className={`rounded-lg p-4 border-2 cursor-pointer hover:shadow-md transform hover:scale-105 transition-all duration-200 ${
                      expiryStatus.status === 'expired' ? 'bg-red-100 border-red-400' :
                      expiryStatus.status === 'urgent' ? 'bg-orange-100 border-orange-400' :
                      expiryStatus.status === 'warning' ? 'bg-yellow-100 border-yellow-400' :
                      'bg-white border-green-200'
                    }`}
                    onClick={() => selectPrepItem(prep)}
                  >
                    {(expiryStatus.status === 'expired' || expiryStatus.status === 'urgent') && (
                      <div className={`mb-2 text-center py-1 rounded font-bold text-xs ${
                        expiryStatus.status === 'expired' ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                      }`}>
                        ⚠️ {expiryStatus.message.toUpperCase()} - DISPATCH NOW!
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-green-800">{prep.dishName}</span>
                      <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                        {prep.totalPortions}p
                      </span>
                    </div>

                    {coldRoomAvailable > 0 && (
                      <div className="mb-2 p-2 bg-blue-100 border border-blue-300 rounded text-xs">
                        <Snowflake className="inline mr-1" size={12} />
                        <span className="font-medium text-blue-700">
                          Cold Room: {coldRoomAvailable}p available
                        </span>
                      </div>
                    )}

                    <div className="text-xs bg-purple-50 border border-purple-200 rounded p-2 mb-2">
                      <div className="font-mono font-bold text-purple-700">
                        Batch: {prep.batchNumber || 'N/A'}
                      </div>
                      <div>Made: {formatDate(prep.dateMade || prep.timestamp)}</div>
                      <div className={`font-medium text-${expiryStatus.color}-600`}>
                        Expires: {formatDate(prep.expiryDate)}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600">
                      {prep.containerSize} | by {prep.preparedBy}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3">
                <div className="text-center py-8">
                  <ChefHat size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-green-700 font-medium">No prep items ready for dispatch</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Go to "Prep Log" tab to add new cooked items.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {dispatchMode === 'inventory' ? (
  <select
    value={newDispatchEntry.dishName}
    onChange={(e) => {
      const itemName = e.target.value;
      const selectedItem = dispatchableInventoryItems.find(item => item.name === itemName);
      setNewDispatchEntry(prev => ({
        ...prev,
        dishName: itemName,
        // AUTO-FILL THE TOTAL QUANTITY FROM INVENTORY
        totalCooked: selectedItem ? selectedItem.currentStock.toString() : '',
        itemType: selectedItem?.category || 'miscellaneous',
        dispatchType: 'inventory',
        batchNumber: `INV-${Date.now()}`
      }));
    }}
    className="w-full p-2 border rounded"
  >
    <option value="">Select Non-Food Item</option>
    {dispatchableInventoryItems.map(item => (
      <option key={item.id} value={item.name}>
        {item.name} ({Math.floor(item.currentStock)} {item.unit})
      </option>
    ))}
  </select>
) : dispatchMode === 'manual' ? (
      <select
        value={newDispatchEntry.dishName}
        onChange={(e) => {
          const dishName = e.target.value;
          setNewDispatchEntry(prev => ({
            ...prev,
            dishName,
            totalCooked: '',
            dispatchType: 'manual'
          }));
        }}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Dish</option>
        {getAllDishNames && typeof getAllDishNames === 'function' ?
          getAllDishNames().map(dish => (
            <option key={dish} value={dish}>{dish}</option>
          )) : []
        }
      </select>
    ) : dispatchMode === 'coldroom' ? (
      <select
        value={newDispatchEntry.dishName}
        onChange={(e) => {
          const dishName = e.target.value;
          const batchInfo = getColdRoomBatchInfo(dishName);
          setNewDispatchEntry(prev => ({
            ...prev,
            dishName,
            totalCooked: getColdRoomStockForDish(dishName).toString(),
            ...(batchInfo || {})
          }));
        }}
        className="w-full p-2 border rounded"
      >
        <option value="">Select Dish</option>
        {Object.keys(coldRoomStock).filter(dish => coldRoomStock[dish].totalPortions > 0).map(dish => (
          <option key={dish} value={dish}>
            {dish} ({coldRoomStock[dish].totalPortions}p available)
          </option>
        ))}
      </select>
    ) : (
      <input
        type="text"
        value={newDispatchEntry.dishName}
        className="w-full p-2 border rounded bg-gray-50"
        placeholder="Select from prep items"
        readOnly
      />
    )}

    {/* Dispatch Form */}
  <div className="dispatch-form bg-white border rounded-lg p-6 mb-6">
    <h3 className="text-lg font-semibold mb-4">
      📦 Dispatch Form - {
        dispatchMode === 'prep' ? 'From Prep Log' :
        dispatchMode === 'coldroom' ? 'From Cold Room' :
        dispatchMode === 'manual' ? 'Manual Entry' :
        'Non-Food Items'
      }
    </h3>

    {/* Show cold room alert if applicable */}
    {dispatchMode === 'prep' && newDispatchEntry.dishName && getColdRoomStockForDish(newDispatchEntry.dishName) > 0 && (
      <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded">
        <Snowflake className="inline mr-2 text-blue-600" size={16} />
        <span className="text-sm font-medium text-blue-700">
          Note: {getColdRoomStockForDish(newDispatchEntry.dishName)} portions already in cold room for {newDispatchEntry.dishName}
        </span>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      <div className={dispatchMode === 'inventory' ? 'col-span-2' : ''}>
        <label className="block text-sm font-medium mb-1">
          {dispatchMode === 'inventory' ? 'Item Name *' : 'Dish Name *'}
        </label>
        {dispatchMode === 'inventory' ? (
          <select
            value={newDispatchEntry.dishName}
            onChange={(e) => {
              const itemName = e.target.value;
              const selectedItem = dispatchableInventoryItems.find(item => item.name === itemName);
              setNewDispatchEntry(prev => ({
                ...prev,
                dishName: itemName,
                // AUTO-FILL THE TOTAL QUANTITY FROM INVENTORY
                totalCooked: selectedItem ? selectedItem.currentStock.toString() : '',
                itemType: selectedItem?.category || 'miscellaneous',
                dispatchType: 'inventory',
                batchNumber: `INV-${Date.now()}`
              }));
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Non-Food Item</option>
            {dispatchableInventoryItems.map(item => (
              <option key={item.id} value={item.name}>
                {item.name} ({Math.floor(item.currentStock)} {item.unit})
              </option>
            ))}
          </select>
        ) : dispatchMode === 'manual' ? (
          <select
            value={newDispatchEntry.dishName}
            onChange={(e) => {
              const dishName = e.target.value;
              setNewDispatchEntry(prev => ({
                ...prev,
                dishName,
                totalCooked: '',
                dispatchType: 'manual'
              }));
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Dish</option>
            {getAllDishNames && typeof getAllDishNames === 'function' ?
              getAllDishNames().map(dish => (
                <option key={dish} value={dish}>{dish}</option>
              )) : []
            }
          </select>
        ) : dispatchMode === 'coldroom' ? (
          <select
            value={newDispatchEntry.dishName}
            onChange={(e) => {
              const dishName = e.target.value;
              const batchInfo = getColdRoomBatchInfo(dishName);
              setNewDispatchEntry(prev => ({
                ...prev,
                dishName,
                totalCooked: getColdRoomStockForDish(dishName).toString(),
                ...(batchInfo || {})
              }));
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Dish</option>
            {Object.keys(coldRoomStock).filter(dish => coldRoomStock[dish].totalPortions > 0).map(dish => (
              <option key={dish} value={dish}>
                {dish} ({coldRoomStock[dish].totalPortions}p available)
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={newDispatchEntry.dishName}
            className="w-full p-2 border rounded bg-gray-50"
            placeholder="Select from prep items"
            readOnly
          />
        )}
      </div>

      {/* Rest of your form fields... */}

          {dispatchMode !== 'coldroom' && (
  <div>
    <label className="block text-sm font-medium mb-1">
      Total {dispatchMode === 'inventory' ? 'Quantity' : 'Portions'} *
    </label>
    <input
      type="number"
      value={newDispatchEntry.totalCooked}
      onChange={(e) => setNewDispatchEntry(prev => ({ ...prev, totalCooked: e.target.value }))}
      className={`w-full p-2 border rounded ${
        dispatchMode === 'prep' || dispatchMode === 'inventory' ? 'bg-gray-50' : ''
      }`}
      placeholder={dispatchMode === 'prep' || dispatchMode === 'inventory' ? "Auto-filled" : "Enter quantity"}
      readOnly={dispatchMode === 'prep' || dispatchMode === 'inventory'}
    />
  </div>
)}

          <div>
            <label className="block text-sm font-medium mb-1">Eastham</label>
            <input
              type="number"
              value={newDispatchEntry.easthamSent}
              onChange={(e) => {
                const eastham = parseInt(e.target.value) || 0;
                const bethnal = parseInt(newDispatchEntry.bethnalSent) || 0;
                const total = parseInt(newDispatchEntry.totalCooked) || 0;

                if (dispatchMode === 'coldroom') {
                  // For cold room, don't auto-calculate cold room stock
                  setNewDispatchEntry(prev => ({
                    ...prev,
                    easthamSent: e.target.value
                  }));
                } else {
                  const coldRoom = Math.max(0, total - eastham - bethnal);
                  setNewDispatchEntry(prev => ({
                    ...prev,
                    easthamSent: e.target.value,
                    coldRoomStock: coldRoom.toString()
                  }));
                }
              }}
              className="w-full p-2 border-2 border-blue-300 rounded focus:border-blue-500"
              placeholder="Quantity"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Bethnal Green</label>
            <input
              type="number"
              value={newDispatchEntry.bethnalSent}
              onChange={(e) => {
                const bethnal = parseInt(e.target.value) || 0;
                const eastham = parseInt(newDispatchEntry.easthamSent) || 0;
                const total = parseInt(newDispatchEntry.totalCooked) || 0;

                if (dispatchMode === 'coldroom') {
                  setNewDispatchEntry(prev => ({
                    ...prev,
                    bethnalSent: e.target.value
                  }));
                } else {
                  const coldRoom = Math.max(0, total - eastham - bethnal);
                  setNewDispatchEntry(prev => ({
                    ...prev,
                    bethnalSent: e.target.value,
                    coldRoomStock: coldRoom.toString()
                  }));
                }
              }}
              className="w-full p-2 border-2 border-green-300 rounded focus:border-green-500"
              placeholder="Quantity"
            />
          </div>

          {dispatchMode !== 'coldroom' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {dispatchMode === 'inventory' ? 'Reserve Stock' : 'Cold Room Stock'}
              </label>
              <input
                type="number"
                value={newDispatchEntry.coldRoomStock}
                onChange={(e) => setNewDispatchEntry(prev => ({ ...prev, coldRoomStock: e.target.value }))}
                className="w-full p-2 border rounded bg-purple-50"
                placeholder={dispatchMode === 'prep' ? "Auto calculated" : "Enter quantity"}
                readOnly={dispatchMode === 'prep'}
              />
            </div>
          )}

          <div className="flex items-end space-x-2">
            <button
              onClick={handleDispatchSubmit}
              disabled={!newDispatchEntry.dishName}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <Plus size={16} className="inline mr-1" />
              Dispatch
            </button>
            <button
              onClick={() => setNewDispatchEntry({
                dishName: '',
                totalCooked: '',
                easthamSent: '',
                bethnalSent: '',
                coldRoomStock: '',
                batchNumber: '',
                expiryDate: '',
                dateMade: '',
                preparedBy: '',
                containerSize: '',
                dispatchType: 'prep',
                itemType: 'food'
              })}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              title="Clear form"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Total Check */}
        {newDispatchEntry.totalCooked && (newDispatchEntry.easthamSent || newDispatchEntry.bethnalSent || newDispatchEntry.coldRoomStock) && dispatchMode !== 'coldroom' && (
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="text-sm">
              <div className="flex justify-between items-center">
                <span>Distribution Check:</span>
                <span className={`font-bold ${
                  (parseInt(newDispatchEntry.easthamSent) || 0) +
                  (parseInt(newDispatchEntry.bethnalSent) || 0) +
                  (parseInt(newDispatchEntry.coldRoomStock) || 0) === parseInt(newDispatchEntry.totalCooked)
                  ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(parseInt(newDispatchEntry.easthamSent) || 0) +
                   (parseInt(newDispatchEntry.bethnalSent) || 0) +
                   (parseInt(newDispatchEntry.coldRoomStock) || 0)} / {newDispatchEntry.totalCooked}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Summary Table */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Today's Dispatch Summary</h3>
        </div>
        <div className="overflow-x-auto">
          {dispatch && dispatch.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Batch #</th>
                  <th className="px-4 py-2 text-left">Item/Dish</th>
                  <th className="px-4 py-2 text-left">Total</th>
                  <th className="px-4 py-2 text-left">Eastham</th>
                  <th className="px-4 py-2 text-left">Bethnal</th>
                  <th className="px-4 py-2 text-left">Cold/Reserve</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dispatch.map(item => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.dispatchType === 'prep' ? 'bg-green-100 text-green-800' :
                        item.dispatchType === 'coldroom' ? 'bg-blue-100 text-blue-800' :
                        item.dispatchType === 'inventory' ? 'bg-orange-100 text-orange-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {item.dispatchType || 'prep'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs font-bold text-purple-600">
                        {item.batchNumber || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-medium">{item.dishName}</td>
                    <td className="px-4 py-2">
                      {item.totalCooked}{item.itemType === 'food' ? 'p' : ''}
                    </td>
                    <td className="px-4 py-2 text-blue-600">
                      {item.easthamSent}{item.itemType === 'food' ? 'p' : ''}
                    </td>
                    <td className="px-4 py-2 text-green-600">
                      {item.bethnalSent}{item.itemType === 'food' ? 'p' : ''}
                    </td>
                    <td className="px-4 py-2 text-purple-600">
                      {item.coldRoomStock}{item.itemType === 'food' ? 'p' : ''}
                    </td>
                    <td className="px-4 py-2">
                      {item.expiryDate ? (
                        <span className={`text-xs font-medium text-${getExpiryStatus(item.expiryDate).color}-600`}>
                          {getExpiryStatus(item.expiryDate).message}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <Truck size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Items Dispatched Today</h3>
              <p className="text-gray-500">Dispatch entries will appear here when you send items to locations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedDispatch;
