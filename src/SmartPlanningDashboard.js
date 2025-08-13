// SmartPlanningDashboard.js
import React, { useState, useEffect } from 'react';
import {
  Calendar, TrendingUp, AlertTriangle, ChefHat, Package,
  Clock, MapPin, CheckCircle, AlertCircle, ArrowRight,
  Zap, Target, Coffee, Sun, Moon, RefreshCw, ChevronRight
} from 'lucide-react';

const SmartPlanningDashboard = ({
  sales = [],
  dispatch = [],
  prepLog = [],
  inventory = [],
  recipes = [],
  getAllDishNames,
  calculateDishCost,
  onQuickPrep // Callback to auto-fill prep form
}) => {
  const [planningData, setPlanningData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('tomorrow');
  const [refreshing, setRefreshing] = useState(false);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  // Time-based cooking multipliers
  const timeMultipliers = {
    morning: { factor: 0.8, label: 'Morning Prep', icon: Coffee },
    lunch: { factor: 1.2, label: 'Lunch Rush', icon: Sun },
    evening: { factor: 1.5, label: 'Dinner Rush', icon: Moon }
  };

  // Day of week demand patterns
  const dayPatterns = {
    0: { name: 'Sunday', factor: 1.3, busy: true },
    1: { name: 'Monday', factor: 0.8, busy: false },
    2: { name: 'Tuesday', factor: 0.9, busy: false },
    3: { name: 'Wednesday', factor: 0.9, busy: false },
    4: { name: 'Thursday', factor: 1.0, busy: false },
    5: { name: 'Friday', factor: 1.2, busy: true },
    6: { name: 'Saturday', factor: 1.3, busy: true }
  };

  // Calculate comprehensive planning data
  const calculatePlanningData = () => {
    const dishes = getAllDishNames ? getAllDishNames() : [];
    const planning = [];
    const targetDate = getTargetDate();

    dishes.forEach(dishName => {
      // Get historical sales (last 14 days for better average)
      const historicalSales = sales.filter(s => {
        if (!s || !s.date) return false;
        const saleDate = new Date(s.date);
        const daysAgo = (new Date() - saleDate) / (1000 * 60 * 60 * 24);
        return daysAgo <= 14 && s.dishName === dishName;
      });

      // Calculate location-specific data
      const locationData = {
        'Eastham': calculateLocationMetrics('Eastham', dishName, historicalSales),
        'Bethnal Green': calculateLocationMetrics('Bethnal Green', dishName, historicalSales),
        'all': null
      };

      // Aggregate data
      const eastham = locationData['Eastham'];
      const bethnal = locationData['Bethnal Green'];

      // Current stock levels (including old stock)
      const currentStock = {
        eastham: eastham.currentStock + eastham.oldStock,
        bethnal: bethnal.currentStock + bethnal.oldStock,
        total: eastham.currentStock + bethnal.currentStock + eastham.oldStock + bethnal.oldStock,
        oldStock: eastham.oldStock + bethnal.oldStock
      };

      // Check for items currently in prep
      const inPrep = prepLog
        .filter(p => p.dishName === dishName && !p.processed)
        .reduce((sum, p) => sum + (p.totalPortions || 0), 0);

      // Cold room stock (dispatched but not sent to locations)
      const coldRoomStock = dispatch
        .filter(d => d.dishName === dishName && d.coldRoomStock > 0)
        .reduce((sum, d) => sum + d.coldRoomStock, 0);

      // Expected demand calculation
      const dayOfWeek = targetDate.getDay();
      const dayPattern = dayPatterns[dayOfWeek];
      const avgDailySales = (eastham.avgDailySales + bethnal.avgDailySales) || 20;
      const expectedDemand = Math.ceil(avgDailySales * dayPattern.factor * 1.1); // 10% buffer

      // Calculate what needs to be cooked
      const totalAvailable = currentStock.total + inPrep + coldRoomStock;
      const needToCook = Math.max(0, expectedDemand - totalAvailable);

      // Determine priority
      let priority = 'low';
      let priorityScore = 0;
      let alerts = [];

      // Priority scoring system
      if (currentStock.total === 0 && expectedDemand > 0) {
        priority = 'critical';
        priorityScore = 100;
        alerts.push({ type: 'critical', message: 'COMPLETELY OUT OF STOCK!' });
      } else if (currentStock.total <= 3 && currentStock.total > 0) {
        priority = 'high';
        priorityScore = 80;
        alerts.push({ type: 'high', message: `Only ${currentStock.total} portions left!` });
      } else if (currentStock.oldStock > expectedDemand * 0.5) {
        priority = 'medium';
        priorityScore = 60;
        alerts.push({ type: 'warning', message: `${currentStock.oldStock}p old stock needs selling` });
      } else if (needToCook > 0) {
        priority = 'medium';
        priorityScore = 40;
      }

      // Check expiry status of batches
      const expiringBatches = checkExpiringBatches(dishName);
      if (expiringBatches.urgent > 0) {
        priorityScore += 20;
        alerts.push({ type: 'expiry', message: `${expiringBatches.urgent} batches expiring soon!` });
      }

      // Calculate suggested cooking amount (in kg)
      const portionsPerKg = getPortionsPerKg(dishName);
      const suggestedKg = needToCook > 0 ? Math.ceil((needToCook / portionsPerKg) * 10) / 10 : 0;
      const cost = calculateDishCost ? calculateDishCost(dishName, suggestedKg) : 0;

      planning.push({
        dishName,
        priority,
        priorityScore,
        alerts,
        currentStock,
        inPrep,
        coldRoomStock,
        totalAvailable,
        expectedDemand,
        needToCook,
        suggestedKg,
        cost,
        dayPattern,
        locationBreakdown: {
          eastham: {
            current: eastham.currentStock,
            old: eastham.oldStock,
            avgSales: eastham.avgDailySales,
            expected: Math.ceil(eastham.avgDailySales * dayPattern.factor)
          },
          bethnal: {
            current: bethnal.currentStock,
            old: bethnal.oldStock,
            avgSales: bethnal.avgDailySales,
            expected: Math.ceil(bethnal.avgDailySales * dayPattern.factor)
          }
        },
        expiringBatches,
        recommendations: generateRecommendations(dishName, currentStock, needToCook, expectedDemand)
      });
    });

    // Sort by priority score
    planning.sort((a, b) => b.priorityScore - a.priorityScore);

    setPlanningData(planning);
  };

  // Helper: Calculate location-specific metrics
  const calculateLocationMetrics = (location, dishName, historicalSales) => {
    const locationSales = historicalSales.filter(s => s.location === location);

    // Current stock at location
    const currentStock = sales
      .filter(s =>
        s.location === location &&
        s.dishName === dishName &&
        !s.endOfDay &&
        s.date === new Date().toISOString().split('T')[0]
      )
      .reduce((sum, s) => sum + (s.remainingPortions || 0), 0);

    // Old stock from previous days
    const oldStock = sales
      .filter(s =>
        s.location === location &&
        s.dishName === dishName &&
        s.endOfDay &&
        s.remainingPortions > 0 &&
        s.date !== new Date().toISOString().split('T')[0]
      )
      .reduce((sum, s) => sum + (s.remainingPortions || 0), 0);

    // Average daily sales
    const totalSold = locationSales.reduce((sum, s) =>
      sum + ((s.receivedPortions || 0) - (s.remainingPortions || 0)), 0
    );
    const avgDailySales = locationSales.length > 0 ? totalSold / 14 : 10;

    return {
      currentStock,
      oldStock,
      avgDailySales: Math.round(avgDailySales)
    };
  };

  // Helper: Check for expiring batches
  const checkExpiringBatches = (dishName) => {
    const now = new Date();
    let urgent = 0;
    let warning = 0;
    let expired = 0;

    // Check prep log
    prepLog
      .filter(p => p.dishName === dishName && !p.processed && p.expiryDate)
      .forEach(p => {
        const expiry = new Date(p.expiryDate);
        const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);

        if (hoursUntilExpiry < 0) expired++;
        else if (hoursUntilExpiry < 24) urgent++;
        else if (hoursUntilExpiry < 48) warning++;
      });

    // Check sales batches
    sales
      .filter(s => s.dishName === dishName && s.expiryDate && s.remainingPortions > 0)
      .forEach(s => {
        const expiry = new Date(s.expiryDate);
        const hoursUntilExpiry = (expiry - now) / (1000 * 60 * 60);

        if (hoursUntilExpiry < 0) expired++;
        else if (hoursUntilExpiry < 24) urgent++;
        else if (hoursUntilExpiry < 48) warning++;
      });

    return { expired, urgent, warning };
  };

  // Helper: Get portions per kg for a dish
  const getPortionsPerKg = (dishName) => {
    const portionConfig = {
      'Biryani': 6,
      'Curry': 10,
      'Pakora': 12,
      'Samosa': 15,
      'default': 8
    };

    for (const [category, portions] of Object.entries(portionConfig)) {
      if (dishName.toLowerCase().includes(category.toLowerCase())) {
        return portions;
      }
    }
    return portionConfig.default;
  };

  // Helper: Generate smart recommendations
  const generateRecommendations = (dishName, currentStock, needToCook, expectedDemand) => {
    const recommendations = [];

    if (currentStock.total === 0) {
      recommendations.push({
        type: 'critical',
        action: 'COOK IMMEDIATELY',
        detail: 'Zero stock - will lose sales!'
      });
    } else if (currentStock.oldStock > expectedDemand * 0.3) {
      recommendations.push({
        type: 'warning',
        action: 'PUSH OLD STOCK FIRST',
        detail: `Sell ${currentStock.oldStock}p old stock before cooking new`
      });
    }

    if (needToCook > expectedDemand * 0.5) {
      recommendations.push({
        type: 'prep',
        action: 'PREP TONIGHT',
        detail: 'Prepare for tomorrow morning dispatch'
      });
    }

    return recommendations;
  };

  // Helper: Get target date based on timeframe
  const getTargetDate = () => {
    const date = new Date();
    if (selectedTimeframe === 'tomorrow') {
      date.setDate(date.getDate() + 1);
    } else if (selectedTimeframe === 'weekend') {
      const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
      date.setDate(date.getDate() + (daysUntilSaturday || 7));
    }
    return date;
  };

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    calculatePlanningData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    calculatePlanningData();
    const interval = setInterval(calculatePlanningData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sales, dispatch, prepLog, selectedLocation, selectedTimeframe]);

  // Filter data based on selection
  const filteredData = planningData.filter(item => {
    if (showCriticalOnly && item.priority !== 'critical' && item.priority !== 'high') {
      return false;
    }
    if (selectedLocation !== 'all') {
      // Filter based on location needs
      const locationData = item.locationBreakdown[selectedLocation.toLowerCase().replace(' ', '')];
      return locationData && (locationData.current <= 5 || locationData.old > 0);
    }
    return true;
  });

  // Calculate summary statistics
  const stats = {
    critical: filteredData.filter(d => d.priority === 'critical').length,
    high: filteredData.filter(d => d.priority === 'high').length,
    totalToCook: filteredData.reduce((sum, d) => sum + d.needToCook, 0),
    totalCost: filteredData.reduce((sum, d) => sum + d.cost, 0),
    itemsWithOldStock: filteredData.filter(d => d.currentStock.oldStock > 0).length,
    totalOldStock: filteredData.reduce((sum, d) => sum + d.currentStock.oldStock, 0)
  };

  const targetDate = getTargetDate();
  const dayPattern = dayPatterns[targetDate.getDay()];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <Zap className="mr-2 text-yellow-500" />
          Smart Planning Dashboard - Chef's Command Center
        </h2>
        <button
          onClick={handleRefresh}
          className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center ${
            refreshing ? 'animate-spin' : ''
          }`}
        >
          <RefreshCw size={16} className="mr-2" />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Planning Context Bar */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div>
              <div className="text-sm text-gray-600">Planning for:</div>
              <div className="text-lg font-bold text-purple-800">
                {dayPattern.name} ({targetDate.toLocaleDateString()})
              </div>
              <div className="text-xs text-purple-600">
                {dayPattern.busy ? '🔥 Busy Day' : '😌 Normal Day'} - {Math.round(dayPattern.factor * 100)}% demand
              </div>
            </div>

            {/* Time-based prep suggestions */}
            <div className="flex space-x-3">
              {Object.entries(timeMultipliers).map(([time, config]) => {
                const Icon = config.icon;
                return (
                  <div key={time} className="text-center">
                    <Icon size={20} className="mx-auto text-gray-600" />
                    <div className="text-xs text-gray-600">{config.label}</div>
                    <div className="text-xs font-bold">{Math.round(config.factor * 100)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Auto-refresh in:</div>
            <div className="text-lg font-mono text-blue-600">5:00</div>
          </div>
        </div>
      </div>

      {/* Critical Alerts Summary */}
      {stats.critical > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="text-red-600 mr-3" size={28} />
              <div>
                <h3 className="text-lg font-bold text-red-800">
                  ⚠️ CRITICAL: {stats.critical} items need IMMEDIATE cooking!
                </h3>
                <p className="text-red-700 text-sm">
                  These items are OUT OF STOCK or critically low. Cook NOW for tomorrow!
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCriticalOnly(!showCriticalOnly)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              {showCriticalOnly ? 'Show All' : 'Show Critical Only'}
            </button>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              <option value="tomorrow">Tomorrow</option>
              <option value="weekend">Weekend</option>
              <option value="today">Today (Emergency)</option>
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              <option value="all">All Locations</option>
              <option value="Eastham">Eastham Only</option>
              <option value="Bethnal Green">Bethnal Green Only</option>
            </select>
          </div>

          {/* Quick Stats */}
          <div className="flex space-x-4 text-sm">
            <div className="px-3 py-1 bg-red-100 text-red-800 rounded">
              Critical: {stats.critical}
            </div>
            <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded">
              High: {stats.high}
            </div>
            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded">
              Old Stock: {stats.totalOldStock}p
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded">
              Total Cost: £{stats.totalCost.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Planning Grid */}
      <div className="space-y-4">
        {filteredData.map((item, index) => (
          <div
            key={item.dishName}
            className={`bg-white border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
              item.priority === 'critical' ? 'border-red-500 bg-red-50' :
              item.priority === 'high' ? 'border-orange-500 bg-orange-50' :
              item.currentStock.oldStock > 0 ? 'border-yellow-500 bg-yellow-50' :
              'border-gray-300'
            }`}
          >
            <div className="grid grid-cols-12 gap-4">
              {/* Priority & Dish Info */}
              <div className="col-span-3">
                <div className="flex items-start space-x-3">
                  <div className={`text-2xl font-bold ${
                    item.priority === 'critical' ? 'text-red-600' :
                    item.priority === 'high' ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{item.dishName}</h4>
                    {item.alerts.map((alert, i) => (
                      <div key={i} className={`text-xs mt-1 ${
                        alert.type === 'critical' ? 'text-red-600 font-bold' :
                        alert.type === 'high' ? 'text-orange-600' :
                        'text-yellow-600'
                      }`}>
                        {alert.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Stock Status */}
              <div className="col-span-3">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Stock:</span>
                    <span className={`font-bold ${
                      item.currentStock.total === 0 ? 'text-red-600' :
                      item.currentStock.total <= 3 ? 'text-orange-600' :
                      'text-green-600'
                    }`}>
                      {item.currentStock.total}p
                      {item.currentStock.oldStock > 0 && (
                        <span className="text-orange-600 ml-1">
                          ({item.currentStock.oldStock}p old)
                        </span>
                      )}
                    </span>
                  </div>
                  {item.inPrep > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">In Prep:</span>
                      <span className="text-blue-600">{item.inPrep}p</span>
                    </div>
                  )}
                  {item.coldRoomStock > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cold Room:</span>
                      <span className="text-purple-600">{item.coldRoomStock}p</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span className="text-gray-700">Total Available:</span>
                    <span>{item.totalAvailable}p</span>
                  </div>
                </div>
              </div>

              {/* Location Breakdown */}
              <div className="col-span-2">
                <div className="text-xs space-y-1">
                  <div className="font-medium text-gray-700 mb-1">By Location:</div>
                  <div>
                    <span className="text-gray-600">E:</span>
                    <span className="ml-1">{item.locationBreakdown.eastham.current}p</span>
                    {item.locationBreakdown.eastham.old > 0 && (
                      <span className="text-orange-600 ml-1">
                        +{item.locationBreakdown.eastham.old}old
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">BG:</span>
                    <span className="ml-1">{item.locationBreakdown.bethnal.current}p</span>
                    {item.locationBreakdown.bethnal.old > 0 && (
                      <span className="text-orange-600 ml-1">
                        +{item.locationBreakdown.bethnal.old}old
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Demand & Action */}
              <div className="col-span-2">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Expected Demand</div>
                  <div className="text-xl font-bold text-blue-600">
                    {item.expectedDemand}p
                  </div>
                  <div className="text-xs text-gray-500">
                    (Avg: {Math.round((item.locationBreakdown.eastham.avgSales +
                           item.locationBreakdown.bethnal.avgSales))}p/day)
                  </div>
                </div>
              </div>

              {/* Cook Recommendation */}
              <div className="col-span-2">
                {item.needToCook > 0 ? (
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Cook Now:</div>
                    <div className="text-2xl font-bold text-green-600">
                      {item.suggestedKg} kg
                    </div>
                    <div className="text-xs text-gray-600">
                      = {item.needToCook}p
                    </div>
                    <div className="text-xs text-green-600 font-medium">
                      £{item.cost.toFixed(2)}
                    </div>
                    <button
                      onClick={() => onQuickPrep && onQuickPrep(item.dishName, item.suggestedKg)}
                      className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 w-full"
                    >
                      <ChefHat size={12} className="inline mr-1" />
                      Quick Prep
                    </button>
                  </div>
                ) : item.currentStock.oldStock > item.expectedDemand * 0.3 ? (
                  <div className="text-center">
                    <div className="px-3 py-2 bg-yellow-100 text-yellow-800 rounded">
                      <div className="text-xs font-medium">Push Old Stock</div>
                      <div className="text-sm font-bold">{item.currentStock.oldStock}p</div>
                      <div className="text-xs">Before cooking</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <CheckCircle className="mx-auto text-green-500" size={24} />
                    <div className="text-xs text-green-600 font-medium mt-1">
                      Sufficient Stock
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {item.recommendations.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="flex items-start space-x-2">
                  <Target size={16} className="text-gray-600 mt-0.5" />
                  <div className="text-xs space-y-1">
                    {item.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-center">
                        <ChevronRight size={12} className="mr-1 text-gray-400" />
                        <span className={`font-medium ${
                          rec.type === 'critical' ? 'text-red-600' :
                          rec.type === 'warning' ? 'text-orange-600' :
                          'text-blue-600'
                        }`}>
                          {rec.action}:
                        </span>
                        <span className="ml-1 text-gray-600">{rec.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Actions */}
      <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-green-800 mb-4">
          📋 Action Summary for {dayPattern.name}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-2">🚨 Critical Actions</h4>
            <ul className="text-sm space-y-1">
              <li>• Cook {stats.critical} critical items NOW</li>
              <li>• Total portions needed: {stats.totalToCook}p</li>
              <li>• Estimated cost: £{stats.totalCost.toFixed(2)}</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-orange-700 mb-2">📦 Old Stock Priority</h4>
            <ul className="text-sm space-y-1">
              <li>• {stats.itemsWithOldStock} items have old stock</li>
              <li>• Total old portions: {stats.totalOldStock}p</li>
              <li>• Create offers for quick sale</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-blue-700 mb-2">⏰ Prep Timeline</h4>
            <ul className="text-sm space-y-1">
              <li>• Start prep by 4 PM today</li>
              <li>• Complete by 9 PM for cooling</li>
              <li>• Dispatch by 7 AM tomorrow</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartPlanningDashboard;
