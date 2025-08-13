// EnhancedMainDashboard.js
import React, { useState, useEffect } from 'react';
import {
  BarChart3, AlertTriangle, TrendingUp, Package, Users,
  DollarSign, Clock, MapPin, ShoppingCart, ChefHat,
  Truck, AlertCircle, CheckCircle, Activity, Target,
  Bell, RefreshCw, ChevronUp, ChevronDown, Zap,
  ThermometerSun, Snowflake, Store, Calendar
} from 'lucide-react';

const EnhancedMainDashboard = ({
  sales = [],
  dispatch = [],
  prepLog = [],
  inventory = [],
  wasteLog = [],
  recipes = [],
  calculateDishCost,
  shopStatuses = {},
  currentUser = {},
  userRole = 'owner',
  onQuickAction // Callback for quick actions
}) => {
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('today');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(60); // seconds
  const [expandedSections, setExpandedSections] = useState({
    alerts: true,
    performance: true,
    operations: true,
    decisions: true
  });

  // Calculate real-time metrics
  const calculateMetrics = () => {
    const now = new Date();
    const todayDate = now.toISOString().split('T')[0];

    // Sales Metrics
    const todaySales = sales.filter(s => s.date === todayDate && !s.endOfDay);
    const totalSoldToday = todaySales.reduce((sum, s) =>
      sum + ((s.receivedPortions || 0) - (s.remainingPortions || 0)), 0
    );
    const totalRevenue = totalSoldToday * 8; // Assuming £8 per portion

    // Stock Metrics
    const criticalStockItems = [];
    const outOfStockItems = [];
    const oldStockItems = [];

    // Analyze stock by location
    ['Eastham', 'Bethnal Green'].forEach(location => {
      const locationSales = sales.filter(s => s.location === location && !s.endOfDay);

      // Group by dish
      const dishStock = {};
      locationSales.forEach(s => {
        if (!dishStock[s.dishName]) {
          dishStock[s.dishName] = { received: 0, remaining: 0, old: 0 };
        }
        dishStock[s.dishName].received += s.receivedPortions || 0;
        dishStock[s.dishName].remaining += s.remainingPortions || 0;
      });

      // Check for critical items
      Object.entries(dishStock).forEach(([dish, stock]) => {
        if (stock.remaining === 0 && stock.received > 0) {
          outOfStockItems.push({ dish, location });
        } else if (stock.remaining > 0 && stock.remaining <= 3) {
          criticalStockItems.push({ dish, location, remaining: stock.remaining });
        }
      });

      // Check for old stock
      sales
        .filter(s => s.location === location && s.endOfDay && s.remainingPortions > 0)
        .forEach(s => {
          oldStockItems.push({
            dish: s.dishName,
            location,
            portions: s.remainingPortions,
            daysOld: Math.floor((now - new Date(s.date)) / (1000 * 60 * 60 * 24))
          });
        });
    });

    // Prep Metrics
    const todayPrep = prepLog.filter(p => p.date === todayDate);
    const totalPreparedToday = todayPrep.reduce((sum, p) => sum + (p.totalPortions || 0), 0);
    const prepCostToday = todayPrep.reduce((sum, p) =>
      sum + (calculateDishCost ? calculateDishCost(p.dishName, p.quantityCooked) : 0), 0
    );

    // Dispatch Metrics
    const todayDispatch = dispatch.filter(d => d.date === todayDate);
    const totalDispatchedToday = todayDispatch.reduce((sum, d) =>
      sum + (d.easthamSent || 0) + (d.bethnalSent || 0), 0
    );

    // Waste Metrics
    const todayWaste = wasteLog.filter(w => w.date === todayDate);
    const totalWasteToday = todayWaste.reduce((sum, w) => sum + (w.portions || 0), 0);
    const wasteValueToday = todayWaste.reduce((sum, w) => sum + (w.value || 0), 0);

    // Inventory Alerts
    const lowInventoryItems = inventory.filter(item => {
      const metrics = calculateInventoryMetrics(item);
      return metrics.closingBalance <= metrics.reorderLevel;
    });

    // Performance Indicators
    const sellThroughRate = totalSoldToday > 0 && totalDispatchedToday > 0 ?
      (totalSoldToday / totalDispatchedToday * 100).toFixed(1) : 0;

    const wasteRate = totalWasteToday > 0 && totalPreparedToday > 0 ?
      (totalWasteToday / totalPreparedToday * 100).toFixed(1) : 0;

    return {
      sales: {
        totalSold: totalSoldToday,
        revenue: totalRevenue,
        averagePerLocation: totalSoldToday / 2,
        sellThroughRate
      },
      stock: {
        critical: criticalStockItems,
        outOfStock: outOfStockItems,
        oldStock: oldStockItems,
        totalOldPortions: oldStockItems.reduce((sum, item) => sum + item.portions, 0)
      },
      prep: {
        totalPrepared: totalPreparedToday,
        cost: prepCostToday,
        itemsPrepped: todayPrep.length
      },
      dispatch: {
        total: totalDispatchedToday,
        eastham: todayDispatch.reduce((sum, d) => sum + (d.easthamSent || 0), 0),
        bethnal: todayDispatch.reduce((sum, d) => sum + (d.bethnalSent || 0), 0)
      },
      waste: {
        portions: totalWasteToday,
        value: wasteValueToday,
        rate: wasteRate
      },
      inventory: {
        lowStock: lowInventoryItems.length,
        criticalItems: lowInventoryItems.filter(i => {
          const m = calculateInventoryMetrics(i);
          return m.closingBalance === 0;
        }).length
      }
    };
  };

  // Calculate inventory metrics helper
  const calculateInventoryMetrics = (item) => {
    const usedThisWeek = calculateUsedFromPrep(item.name);
    const closingBalance = (item.openingStock || 0) + (item.receivedThisWeek || 0) - usedThisWeek;
    const reorderLevel = item.reorderLevel || 1;

    return {
      closingBalance,
      reorderLevel,
      usedThisWeek,
      procurementRequired: closingBalance < reorderLevel ?
        Math.max(0, reorderLevel - closingBalance + reorderLevel * 0.5) : 0
    };
  };

  // Calculate used from prep
  const calculateUsedFromPrep = (ingredientName) => {
    let totalUsed = 0;
    prepLog.forEach(prep => {
      const recipeItems = recipes.filter(r =>
        r.dishName === prep.dishName && r.ingredient === ingredientName
      );
      recipeItems.forEach(recipe => {
        totalUsed += recipe.quantityPer1kg * prep.quantityCooked;
      });
    });
    return totalUsed;
  };

  // Generate real-time alerts
  const generateAlerts = (metrics) => {
    const alerts = [];
    const now = new Date();

    // Critical stock alerts
    metrics.stock.outOfStock.forEach(item => {
      alerts.push({
        id: `out-${item.dish}-${item.location}`,
        type: 'critical',
        category: 'stock',
        title: `OUT OF STOCK: ${item.dish}`,
        message: `${item.location} has completely run out!`,
        location: item.location,
        timestamp: now,
        action: 'Cook immediately',
        priority: 1
      });
    });

    metrics.stock.critical.forEach(item => {
      alerts.push({
        id: `low-${item.dish}-${item.location}`,
        type: 'high',
        category: 'stock',
        title: `LOW STOCK: ${item.dish}`,
        message: `Only ${item.remaining} portions left at ${item.location}`,
        location: item.location,
        timestamp: now,
        action: 'Prepare more urgently',
        priority: 2
      });
    });

    // Old stock alerts
    if (metrics.stock.totalOldPortions > 0) {
      alerts.push({
        id: 'old-stock-alert',
        type: 'warning',
        category: 'stock',
        title: 'OLD STOCK ALERT',
        message: `${metrics.stock.totalOldPortions} portions need offers`,
        timestamp: now,
        action: 'Create special offers',
        priority: 3
      });
    }

    // Waste alerts
    if (parseFloat(metrics.waste.rate) > 10) {
      alerts.push({
        id: 'high-waste',
        type: 'warning',
        category: 'operations',
        title: 'HIGH WASTE RATE',
        message: `Waste rate at ${metrics.waste.rate}% - above 10% threshold`,
        timestamp: now,
        action: 'Review production planning',
        priority: 3
      });
    }

    // Inventory alerts
    if (metrics.inventory.criticalItems > 0) {
      alerts.push({
        id: 'inventory-critical',
        type: 'high',
        category: 'inventory',
        title: 'INVENTORY CRITICAL',
        message: `${metrics.inventory.criticalItems} items need immediate ordering`,
        timestamp: now,
        action: 'Place orders now',
        priority: 2
      });
    }

    // Shop status alerts
    Object.entries(shopStatuses).forEach(([location, status]) => {
      if (!status.isOpen && now.getHours() >= 9 && now.getHours() < 21) {
        alerts.push({
          id: `shop-closed-${location}`,
          type: 'info',
          category: 'operations',
          title: `${location} CLOSED`,
          message: 'Shop should be open during business hours',
          location,
          timestamp: now,
          action: 'Check shop status',
          priority: 4
        });
      }
    });

    // Sort by priority
    alerts.sort((a, b) => a.priority - b.priority);

    return alerts;
  };

  // Quick action handler
  const handleQuickAction = (action, data) => {
    if (onQuickAction) {
      onQuickAction(action, data);
    }

    // Show confirmation
    alert(`✅ Action initiated: ${action}`);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        const metrics = calculateMetrics();
        const alerts = generateAlerts(metrics);
        setRealTimeAlerts(alerts);
      }, refreshInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, sales, dispatch, prepLog]);

  // Initial load
  useEffect(() => {
    const metrics = calculateMetrics();
    const alerts = generateAlerts(metrics);
    setRealTimeAlerts(alerts);
  }, []);

  const metrics = calculateMetrics();
  const currentHour = new Date().getHours();
  const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

  return (
    <div className="p-6">
      {/* Header with Live Status */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Activity className="mr-2 text-blue-500" />
            Live Operations Dashboard
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Welcome back, {currentUser.name || userRole} • {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
              className="px-2 py-1 border rounded text-sm"
            >
              <option value="30">30s</option>
              <option value="60">1m</option>
              <option value="300">5m</option>
            </select>
          </div>

          <button
            onClick={() => {
              const metrics = calculateMetrics();
              const alerts = generateAlerts(metrics);
              setRealTimeAlerts(alerts);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          >
            <RefreshCw size={16} className="mr-2" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Live Alerts Section */}
      <div className="mb-6">
        <div
          className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-t-lg cursor-pointer"
          onClick={() => toggleSection('alerts')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Bell className="mr-2 text-red-500" size={20} />
            Live Alerts & Notifications ({realTimeAlerts.length})
          </h3>
          {expandedSections.alerts ? <ChevronUp /> : <ChevronDown />}
        </div>

        {expandedSections.alerts && (
          <div className="bg-white border-x border-b border-red-200 rounded-b-lg p-4">
            {realTimeAlerts.length > 0 ? (
              <div className="space-y-3">
                {realTimeAlerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${
                    alert.type === 'critical' ? 'bg-red-100 border border-red-300' :
                    alert.type === 'high' ? 'bg-orange-100 border border-orange-300' :
                    alert.type === 'warning' ? 'bg-yellow-100 border border-yellow-300' :
                    'bg-blue-100 border border-blue-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <AlertCircle className={`${
                        alert.type === 'critical' ? 'text-red-600' :
                        alert.type === 'high' ? 'text-orange-600' :
                        alert.type === 'warning' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} size={24} />
                      <div>
                        <h4 className="font-bold">{alert.title}</h4>
                        <p className="text-sm text-gray-700">{alert.message}</p>
                        {alert.location && (
                          <span className="text-xs text-gray-600">
                            <MapPin size={12} className="inline mr-1" />
                            {alert.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleQuickAction(alert.action, alert)}
                      className={`px-3 py-1 rounded text-white text-sm ${
                        alert.type === 'critical' ? 'bg-red-600 hover:bg-red-700' :
                        alert.type === 'high' ? 'bg-orange-600 hover:bg-orange-700' :
                        'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {alert.action}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
                <p className="text-green-600 font-medium">All systems operational</p>
                <p className="text-sm text-gray-600">No critical alerts at this time</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="text-green-600" size={24} />
            <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
              Live
            </span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            £{metrics.sales.revenue.toFixed(0)}
          </div>
          <div className="text-sm text-green-600">Today's Revenue</div>
          <div className="text-xs text-gray-600 mt-1">
            {metrics.sales.totalSold} portions sold
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          metrics.stock.outOfStock.length > 0
            ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
            : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <Package className={
              metrics.stock.outOfStock.length > 0 ? 'text-red-600' : 'text-blue-600'
            } size={24} />
            {metrics.stock.outOfStock.length > 0 && (
              <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded animate-pulse">
                CRITICAL
              </span>
            )}
          </div>
          <div className={`text-2xl font-bold ${
            metrics.stock.outOfStock.length > 0 ? 'text-red-700' : 'text-blue-700'
          }`}>
            {metrics.stock.outOfStock.length + metrics.stock.critical.length}
          </div>
          <div className={
            metrics.stock.outOfStock.length > 0 ? 'text-sm text-red-600' : 'text-sm text-blue-600'
          }>
            Stock Alerts
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {metrics.stock.outOfStock.length} out, {metrics.stock.critical.length} low
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <ChefHat className="text-purple-600" size={24} />
            <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded">
              {timeOfDay}
            </span>
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {metrics.prep.totalPrepared}p
          </div>
          <div className="text-sm text-purple-600">Prepped Today</div>
          <div className="text-xs text-gray-600 mt-1">
            Cost: £{metrics.prep.cost.toFixed(0)}
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${
          parseFloat(metrics.waste.rate) > 10
            ? 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
            : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className={
              parseFloat(metrics.waste.rate) > 10 ? 'text-orange-600' : 'text-gray-600'
            } size={24} />
            {parseFloat(metrics.waste.rate) > 10 && (
              <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                HIGH
              </span>
            )}
          </div>
          <div className={`text-2xl font-bold ${
            parseFloat(metrics.waste.rate) > 10 ? 'text-orange-700' : 'text-gray-700'
          }`}>
            {metrics.waste.rate}%
          </div>
          <div className={
            parseFloat(metrics.waste.rate) > 10 ? 'text-sm text-orange-600' : 'text-sm text-gray-600'
          }>
            Waste Rate
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {metrics.waste.portions}p wasted
          </div>
        </div>
      </div>

      {/* Location Performance */}
      <div className="mb-6">
        <div
          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-t-lg cursor-pointer"
          onClick={() => toggleSection('performance')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <TrendingUp className="mr-2 text-blue-500" size={20} />
            Location Performance
          </h3>
          {expandedSections.performance ? <ChevronUp /> : <ChevronDown />}
        </div>

        {expandedSections.performance && (
          <div className="bg-white border-x border-b border-blue-200 rounded-b-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {['Eastham', 'Bethnal Green'].map(location => {
                const status = shopStatuses[location] || {};
                const locationSales = sales.filter(s =>
                  s.location === location &&
                  s.date === new Date().toISOString().split('T')[0] &&
                  !s.endOfDay
                );
                const received = locationSales.reduce((sum, s) => sum + (s.receivedPortions || 0), 0);
                const sold = locationSales.reduce((sum, s) =>
                  sum + ((s.receivedPortions || 0) - (s.remainingPortions || 0)), 0
                );
                const remaining = received - sold;
                const sellRate = received > 0 ? (sold / received * 100).toFixed(0) : 0;

                return (
                  <div key={location} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold flex items-center">
                        <Store className="mr-2" size={20} />
                        {location}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        status.isOpen
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {status.isOpen ? '🟢 OPEN' : '🔴 CLOSED'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-gray-600">Received</div>
                        <div className="font-bold text-lg">{received}p</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Sold</div>
                        <div className="font-bold text-lg text-green-600">{sold}p</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Remaining</div>
                        <div className="font-bold text-lg text-blue-600">{remaining}p</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Sell Rate</div>
                        <div className={`font-bold text-lg ${
                          sellRate >= 80 ? 'text-green-600' :
                          sellRate >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {sellRate}%
                        </div>
                      </div>
                    </div>

                    {/* Location-specific alerts */}
                    {metrics.stock.critical
                      .filter(item => item.location === location)
                      .slice(0, 3)
                      .map((item, i) => (
                        <div key={i} className="mt-2 text-xs bg-orange-50 text-orange-700 p-2 rounded">
                          {item.dish}: {item.remaining}p left
                        </div>
                      ))
                    }
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Operations Summary */}
      <div className="mb-6">
        <div
          className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-t-lg cursor-pointer"
          onClick={() => toggleSection('operations')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Activity className="mr-2 text-green-500" size={20} />
            Operations Summary
          </h3>
          {expandedSections.operations ? <ChevronUp /> : <ChevronDown />}
        </div>

        {expandedSections.operations && (
          <div className="bg-white border-x border-b border-green-200 rounded-b-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Prep Status */}
              <div className="text-center">
                <ChefHat className="mx-auto mb-2 text-purple-500" size={32} />
                <div className="text-2xl font-bold">{metrics.prep.itemsPrepped}</div>
                <div className="text-sm text-gray-600">Items Prepped</div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.prep.totalPrepared}p total
                </div>
              </div>

              {/* Dispatch Status */}
              <div className="text-center">
                <Truck className="mx-auto mb-2 text-blue-500" size={32} />
                <div className="text-2xl font-bold">{metrics.dispatch.total}p</div>
                <div className="text-sm text-gray-600">Dispatched</div>
                <div className="text-xs text-gray-500 mt-1">
                  E: {metrics.dispatch.eastham} | BG: {metrics.dispatch.bethnal}
                </div>
              </div>

              {/* Inventory Status */}
              <div className="text-center">
                <Package className="mx-auto mb-2 text-orange-500" size={32} />
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.inventory.lowStock}
                </div>
                <div className="text-sm text-gray-600">Low Inventory</div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.inventory.criticalItems} critical
                </div>
              </div>

              {/* Old Stock */}
              <div className="text-center">
                <Clock className="mx-auto mb-2 text-yellow-500" size={32} />
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.stock.totalOldPortions}p
                </div>
                <div className="text-sm text-gray-600">Old Stock</div>
                <div className="text-xs text-gray-500 mt-1">
                  {metrics.stock.oldStock.length} items
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Decisions & Actions */}
      <div className="mb-6">
        <div
          className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-t-lg cursor-pointer"
          onClick={() => toggleSection('decisions')}
        >
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="mr-2 text-purple-500" size={20} />
            Quick Decisions Required
          </h3>
          {expandedSections.decisions ? <ChevronUp /> : <ChevronDown />}
        </div>

        {expandedSections.decisions && (
          <div className="bg-white border-x border-b border-purple-200 rounded-b-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Critical Cooking */}
              {metrics.stock.outOfStock.length > 0 && (
                <div className="border-2 border-red-400 rounded-lg p-4 bg-red-50">
                  <h4 className="font-bold text-red-700 mb-2">
                    🚨 Cook Immediately
                  </h4>
                  <ul className="text-sm space-y-1 mb-3">
                    {metrics.stock.outOfStock.slice(0, 3).map((item, i) => (
                      <li key={i}>• {item.dish} ({item.location})</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleQuickAction('prep', {
                      items: metrics.stock.outOfStock
                    })}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Go to Prep Log
                  </button>
                </div>
              )}

              {/* Old Stock Offers */}
              {metrics.stock.totalOldPortions > 0 && (
                <div className="border-2 border-orange-400 rounded-lg p-4 bg-orange-50">
                  <h4 className="font-bold text-orange-700 mb-2">
                    💰 Create Offers
                  </h4>
                  <p className="text-sm mb-3">
                    {metrics.stock.totalOldPortions} portions need offers across {metrics.stock.oldStock.length} items
                  </p>
                  <button
                    onClick={() => handleQuickAction('offers', {
                      oldStock: metrics.stock.oldStock
                    })}
                    className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                  >
                    Generate Offers
                  </button>
                </div>
              )}

              {/* Inventory Orders */}
              {metrics.inventory.criticalItems > 0 && (
                <div className="border-2 border-blue-400 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-bold text-blue-700 mb-2">
                    📦 Place Orders
                  </h4>
                  <p className="text-sm mb-3">
                    {metrics.inventory.criticalItems} items need immediate ordering
                  </p>
                  <button
                    onClick={() => handleQuickAction('procurement', {
                      critical: metrics.inventory.criticalItems
                    })}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Go to Procurement
                  </button>
                </div>
              )}

              {/* High Waste Alert */}
              {parseFloat(metrics.waste.rate) > 10 && (
                <div className="border-2 border-yellow-400 rounded-lg p-4 bg-yellow-50">
                  <h4 className="font-bold text-yellow-700 mb-2">
                    ⚠️ Review Waste
                  </h4>
                  <p className="text-sm mb-3">
                    Waste at {metrics.waste.rate}% - Review production planning
                  </p>
                  <button
                    onClick={() => handleQuickAction('waste-analysis', {
                      rate: metrics.waste.rate
                    })}
                    className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                  >
                    Analyze Waste
                  </button>
                </div>
              )}

              {/* All Clear */}
              {metrics.stock.outOfStock.length === 0 &&
               metrics.stock.critical.length === 0 &&
               metrics.stock.totalOldPortions === 0 &&
               metrics.inventory.criticalItems === 0 &&
               parseFloat(metrics.waste.rate) <= 10 && (
                <div className="border-2 border-green-400 rounded-lg p-4 bg-green-50 col-span-full">
                  <div className="text-center">
                    <CheckCircle className="mx-auto mb-3 text-green-500" size={48} />
                    <h4 className="font-bold text-green-700 text-lg">
                      All Systems Optimal
                    </h4>
                    <p className="text-sm text-green-600 mt-2">
                      No immediate actions required. Great job maintaining operations!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Daily Targets */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center">
          <Target className="mr-2" size={20} />
          Today's Performance vs Targets
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Revenue Target</div>
            <div className="bg-white rounded-lg p-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    £{metrics.sales.revenue.toFixed(0)}
                  </div>
                  <div className="text-xs text-gray-500">of £2,000</div>
                </div>
                <div className={`text-sm font-bold ${
                  metrics.sales.revenue >= 2000 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {((metrics.sales.revenue / 2000) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${Math.min(100, (metrics.sales.revenue / 2000) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Portions Target</div>
            <div className="bg-white rounded-lg p-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.sales.totalSold}
                  </div>
                  <div className="text-xs text-gray-500">of 250</div>
                </div>
                <div className={`text-sm font-bold ${
                  metrics.sales.totalSold >= 250 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {((metrics.sales.totalSold / 250) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${Math.min(100, (metrics.sales.totalSold / 250) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Waste Target</div>
            <div className="bg-white rounded-lg p-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className={`text-2xl font-bold ${
                    parseFloat(metrics.waste.rate) <= 5 ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {metrics.waste.rate}%
                  </div>
                  <div className="text-xs text-gray-500">max 5%</div>
                </div>
                <div className={`text-sm font-bold ${
                  parseFloat(metrics.waste.rate) <= 5 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {parseFloat(metrics.waste.rate) <= 5 ? '✓' : '✗'}
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    parseFloat(metrics.waste.rate) <= 5 ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (parseFloat(metrics.waste.rate) / 5) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-600 mb-1">Efficiency</div>
            <div className="bg-white rounded-lg p-3">
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {metrics.sales.sellThroughRate}%
                  </div>
                  <div className="text-xs text-gray-500">sell-through</div>
                </div>
                <div className={`text-sm font-bold ${
                  parseFloat(metrics.sales.sellThroughRate) >= 80 ? 'text-green-600' : 'text-orange-600'
                }`}>
                  {parseFloat(metrics.sales.sellThroughRate) >= 80 ? 'Good' : 'Improve'}
                </div>
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${metrics.sales.sellThroughRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMainDashboard;
