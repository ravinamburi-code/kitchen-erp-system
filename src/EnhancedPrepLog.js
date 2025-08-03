// EnhancedPrepLog.js - Complete Working Version
import React, { useState, useEffect } from 'react';
import {
  ChefHat, Plus, Calculator, AlertTriangle, CheckCircle,
  TrendingUp, Clock, Package, Trash2
} from 'lucide-react';

const EnhancedPrepLog = ({
  prepLog = [],
  setPrepLog = () => {},
  recipes = [],
  inventory = [],
  sales = [],
  calculateDishCost = () => 0,
  checkIngredientAvailability = () => []
}) => {
  // Get recipe metadata from localStorage
  const getRecipeMetadata = (dishName) => {
    try {
      const metadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
      return metadata[dishName] || null;
    } catch (error) {
      console.error('Error loading recipe metadata:', error);
      return null;
    }
  };

  // Get all available dishes from Recipe Bank
  const getAvailableDishes = () => {
    try {
      const metadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
      return Object.keys(metadata).sort();
    } catch (error) {
      console.error('Error getting dishes:', error);
      return [];
    }
  };

  // Enhanced prep entry state
  const [newPrepEntry, setNewPrepEntry] = useState({
    dishName: '',
    rawWeight: '',
    cookedWeight: '',
    actualYield: '',
    containerSize: '',
    portionSize: '',
    totalPortions: '',
    preparedBy: 'Vasanth',
    temperature: '',
    notes: ''
  });

  // Smart suggestions state
  const [prepSuggestions, setPrepSuggestions] = useState([]);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Calculate prep suggestions
  const calculatePrepSuggestion = (dishName) => {
    const metadata = getRecipeMetadata(dishName);
    if (!metadata) return null;

    // Get last 7 days sales for this dish
    const last7DaysSales = sales.filter(s => {
      if (!s || !s.date) return false;
      const saleDate = new Date(s.date);
      const daysAgo = (new Date() - saleDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7 && s.dishName === dishName;
    });

    // Calculate average daily sales
    let avgDailySales = 20; // Default
    if (last7DaysSales.length > 0) {
      const totalSold = last7DaysSales.reduce((sum, s) =>
        sum + ((s.receivedPortions || 0) - (s.remainingPortions || 0)), 0
      );
      avgDailySales = Math.round(totalSold / 7);
    }

    // Day of week multiplier
    const dayMultiplier = {
      0: 1.3,  // Sunday
      1: 0.8,  // Monday
      2: 0.9,  // Tuesday
      3: 0.9,  // Wednesday
      4: 1.0,  // Thursday
      5: 1.2,  // Friday
      6: 1.3   // Saturday
    };

    const today = new Date().getDay();
    const todayMultiplier = dayMultiplier[today] || 1;

    // Calculate current stock
    const currentStock = sales
      .filter(s => s && s.dishName === dishName && !s.endOfDay)
      .reduce((sum, s) => sum + (s.remainingPortions || 0), 0);

    const oldStock = sales
      .filter(s => s && s.dishName === dishName && s.endOfDay && s.finalStock > 0)
      .reduce((sum, s) => sum + (s.finalStock || 0), 0);

    const totalStock = currentStock + oldStock;

    // Calculate suggestion based on metadata
    const expectedDemand = Math.ceil(avgDailySales * todayMultiplier * 1.1);
    const needToPrepare = Math.max(0, expectedDemand - totalStock);
    const kgToPrepare = Math.ceil((needToPrepare / (metadata.portionsPerKg || 8)) * 10) / 10;

    return {
      dishName,
      metadata,
      avgDailySales,
      currentStock,
      oldStock,
      totalStock,
      expectedDemand,
      needToPrepare,
      kgToPrepare,
      rawWeightNeeded: metadata.rawWeight ? (kgToPrepare * metadata.rawWeight / metadata.cookedWeight) : kgToPrepare,
      totalPortions: Math.floor(kgToPrepare * (metadata.portionsPerKg || 8)),
      priority: needToPrepare > expectedDemand * 0.5 ? 'high' :
               needToPrepare > 0 ? 'medium' : 'low'
    };
  };

  // Auto-fill from recipe selection
  const handleDishSelection = (dishName) => {
    const metadata = getRecipeMetadata(dishName);
    if (metadata) {
      console.log('Loading metadata for:', dishName, metadata);
      setNewPrepEntry({
        dishName,
        rawWeight: '',
        cookedWeight: '',
        actualYield: '',
        containerSize: metadata.containerSize || '500ml',
        portionSize: (metadata.portionSize || 160).toString(),
        totalPortions: '',
        preparedBy: newPrepEntry.preparedBy,
        temperature: '',
        notes: metadata.yield ? `Standard recipe - Expected yield: ${metadata.yield}%` : ''
      });
    } else {
      // If no metadata, use defaults
      setNewPrepEntry({
        dishName,
        rawWeight: '',
        cookedWeight: '',
        actualYield: '',
        containerSize: '500ml',
        portionSize: '160',
        totalPortions: '',
        preparedBy: newPrepEntry.preparedBy,
        temperature: '',
        notes: 'No recipe metadata found - using defaults'
      });
    }
  };

  // Calculate portions when weight changes
  const handleCookedWeightChange = (weight) => {
    const metadata = getRecipeMetadata(newPrepEntry.dishName);
    if (weight) {
      const cookedGrams = parseFloat(weight) * 1000;
      const portionSizeGrams = parseFloat(newPrepEntry.portionSize || metadata?.portionSize || 160);
      const portions = Math.floor(cookedGrams / portionSizeGrams);

      const actualYield = newPrepEntry.rawWeight
        ? ((parseFloat(weight) / parseFloat(newPrepEntry.rawWeight)) * 100).toFixed(1)
        : '';

      setNewPrepEntry(prev => ({
        ...prev,
        cookedWeight: weight,
        totalPortions: portions.toString(),
        actualYield
      }));
    } else {
      setNewPrepEntry(prev => ({
        ...prev,
        cookedWeight: weight,
        totalPortions: '',
        actualYield: ''
      }));
    }
  };

  // Submit prep entry
  const handlePrepSubmit = async () => {
    if (newPrepEntry.dishName && newPrepEntry.cookedWeight && newPrepEntry.totalPortions) {
      // Check ingredient availability
      const shortages = checkIngredientAvailability(
        newPrepEntry.dishName,
        parseFloat(newPrepEntry.cookedWeight)
      );

      if (shortages && shortages.length > 0) {
        const shortageMsg = shortages.map(s =>
          `${s.ingredient}: Need ${s.required.toFixed(2)} but only have ${s.available.toFixed(2)}`
        ).join('\n');

        if (!window.confirm(`⚠️ Insufficient ingredients:\n\n${shortageMsg}\n\nProceed anyway?`)) {
          return;
        }
      }

      const metadata = getRecipeMetadata(newPrepEntry.dishName);
      const now = new Date();

      const newEntry = {
        id: prepLog.length > 0 ? Math.max(...prepLog.map(p => p.id || 0)) + 1 : 1,
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(),
        prepTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        dishName: newPrepEntry.dishName,
        rawWeight: parseFloat(newPrepEntry.rawWeight) || 0,
        quantityCooked: parseFloat(newPrepEntry.cookedWeight),
        actualYield: parseFloat(newPrepEntry.actualYield) || 0,
        expectedYield: metadata?.yield || 0,
        preparedBy: newPrepEntry.preparedBy,
        portionSize: parseInt(newPrepEntry.portionSize) || 160,
        containerSize: newPrepEntry.containerSize || '500ml',
        totalPortions: parseInt(newPrepEntry.totalPortions),
        temperature: newPrepEntry.temperature,
        notes: newPrepEntry.notes,
        processed: false,
        status: 'fresh',
        cost: calculateDishCost(newPrepEntry.dishName, parseFloat(newPrepEntry.cookedWeight))
      };

      setPrepLog(prev => [...prev, newEntry]);

      // Check if yield is significantly different from expected
      if (metadata && metadata.yield && Math.abs(newEntry.actualYield - metadata.yield) > 5) {
        alert(`📊 Yield Analysis:\n\nExpected: ${metadata.yield}%\nActual: ${newEntry.actualYield}%\nDifference: ${(newEntry.actualYield - metadata.yield).toFixed(1)}%\n\n${
          newEntry.actualYield < metadata.yield
            ? '⚠️ Lower yield than expected - check cooking process'
            : '✅ Better yield than expected - good job!'
        }`);
      }

      // Success message
      alert(`✅ Successfully added ${newEntry.totalPortions} portions of ${newEntry.dishName}!\n\n📦 Container: ${newEntry.containerSize}\n⚖️ Portion: ${newEntry.portionSize}g\n📊 Yield: ${newEntry.actualYield}%\n👨‍🍳 Chef: ${newEntry.preparedBy}`);

      // Reset form
      setNewPrepEntry({
        dishName: '',
        rawWeight: '',
        cookedWeight: '',
        actualYield: '',
        containerSize: '',
        portionSize: '',
        totalPortions: '',
        preparedBy: newPrepEntry.preparedBy,
        temperature: '',
        notes: ''
      });
    } else {
      alert('❌ Please fill in all required fields');
    }
  };

  // Delete prep item
  const handleDeletePrepItem = async (prepId) => {
    const prepItem = prepLog.find(p => p.id === prepId);
    if (!prepItem) return;

    if (prepItem.processed) {
      alert('❌ Cannot delete dispatched items!');
      return;
    }

    if (window.confirm(`Delete ${prepItem.dishName} (${prepItem.totalPortions} portions)?`)) {
      setPrepLog(prev => prev.filter(p => p.id !== prepId));
      alert('✅ Prep entry deleted successfully');
    }
  };

  // Generate suggestions on mount
  useEffect(() => {
    const dishes = getAvailableDishes();
    if (dishes.length > 0) {
      const suggestions = dishes
        .map(dish => calculatePrepSuggestion(dish))
        .filter(s => s && s.kgToPrepare > 0)
        .sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
      setPrepSuggestions(suggestions);
    }
  }, [sales, prepLog]);

  // Get available dishes for dropdown
  const availableDishes = getAvailableDishes();

  // If no recipes with metadata, show message
  if (availableDishes.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <ChefHat className="mr-2" /> Smart Prep Planning
        </h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 text-yellow-600" size={48} />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Recipes Available</h3>
          <p className="text-yellow-700 mb-4">
            Your recipes need to be configured with portion details first.
          </p>
          <div className="text-left max-w-md mx-auto">
            <p className="text-sm text-yellow-700 mb-2">To fix this:</p>
            <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
              <li>Go to Recipe Bank</li>
              <li>Click "Fix Existing Recipes" button</li>
              <li>Or edit each recipe to add container size and portion info</li>
              <li>Come back here to start prep</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <ChefHat className="mr-2" /> Smart Prep Planning with Recipe Integration
      </h2>

      {/* Smart Prep Suggestions */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-blue-800">
            🧠 AI-Powered Prep Suggestions - {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </h3>
          <button
            onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showDetailedAnalysis ? 'Hide' : 'Show'} Details
          </button>
        </div>

        <div className="space-y-3">
          {prepSuggestions.length > 0 ? (
            prepSuggestions.map(suggestion => (
              <div
                key={suggestion.dishName}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  suggestion.priority === 'high'
                    ? 'bg-red-50 border-red-300 hover:border-red-400'
                    : suggestion.priority === 'medium'
                    ? 'bg-yellow-50 border-yellow-300 hover:border-yellow-400'
                    : 'bg-green-50 border-green-300 hover:border-green-400'
                }`}
                onClick={() => {
                  handleDishSelection(suggestion.dishName);
                  // Auto-fill with suggested quantities
                  setNewPrepEntry(prev => ({
                    ...prev,
                    rawWeight: suggestion.rawWeightNeeded.toFixed(1),
                    cookedWeight: suggestion.kgToPrepare.toString()
                  }));
                  handleCookedWeightChange(suggestion.kgToPrepare.toString());
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-lg">{suggestion.dishName}</h4>
                    <div className="text-sm text-gray-600">
                      Current: {suggestion.totalStock}p
                      {suggestion.oldStock > 0 && (
                        <span className="text-orange-600 ml-2">({suggestion.oldStock}p old!)</span>
                      )}
                      • Daily avg: {suggestion.avgDailySales}p
                      • Expected today: {suggestion.expectedDemand}p
                    </div>
                    {showDetailedAnalysis && suggestion.metadata && (
                      <div className="mt-2 text-xs text-gray-500">
                        Container: {suggestion.metadata.containerSize} |
                        Portion: {suggestion.metadata.portionSize}g |
                        Yield: {suggestion.metadata.yield}%
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      Prep {suggestion.kgToPrepare} kg
                    </div>
                    <div className="text-sm text-gray-600">
                      Raw needed: {suggestion.rawWeightNeeded.toFixed(1)} kg
                    </div>
                    <div className="text-sm text-blue-600">
                      = {suggestion.totalPortions} portions
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Cost: £{calculateDishCost(suggestion.dishName, suggestion.kgToPrepare).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle size={48} className="mx-auto mb-2 text-green-500" />
              <p className="text-lg">All items have sufficient stock!</p>
              <p className="text-sm">Check back later or prep for tomorrow.</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Prep Entry Form */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">
          🧑‍🍳 Add New Prep Entry {newPrepEntry.dishName && `- ${newPrepEntry.dishName}`}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Recipe *
            </label>
            <select
              value={newPrepEntry.dishName}
              onChange={(e) => handleDishSelection(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Choose a recipe...</option>
              {availableDishes.map(dish => {
                const metadata = getRecipeMetadata(dish);
                return (
                  <option key={dish} value={dish}>
                    {dish} {metadata?.containerSize ? `(${metadata.containerSize})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Raw Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={newPrepEntry.rawWeight}
              onChange={(e) => setNewPrepEntry(prev => ({ ...prev, rawWeight: e.target.value }))}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="5.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cooked Weight (kg) *
            </label>
            <input
              type="number"
              step="0.1"
              value={newPrepEntry.cookedWeight}
              onChange={(e) => handleCookedWeightChange(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              placeholder="4.5"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Actual Yield %
            </label>
            <div className="p-2 border rounded bg-gray-100">
              {newPrepEntry.actualYield || '-'}%
              {newPrepEntry.dishName && getRecipeMetadata(newPrepEntry.dishName)?.yield && (
                <span className="text-xs text-gray-600 ml-2">
                  (Expected: {getRecipeMetadata(newPrepEntry.dishName).yield}%)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Container Size</label>
            <input
              type="text"
              value={newPrepEntry.containerSize}
              className="w-full p-2 border rounded bg-gray-100"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Portion Size (g)</label>
            <input
              type="text"
              value={newPrepEntry.portionSize}
              onChange={(e) => {
                setNewPrepEntry(prev => ({ ...prev, portionSize: e.target.value }));
                // Recalculate portions if cooked weight exists
                if (newPrepEntry.cookedWeight) {
                  handleCookedWeightChange(newPrepEntry.cookedWeight);
                }
              }}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Total Portions</label>
            <input
              type="text"
              value={newPrepEntry.totalPortions}
              className="w-full p-2 border rounded bg-gray-100 font-bold text-green-600"
              readOnly
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Temperature (°C)</label>
            <input
              type="number"
              value={newPrepEntry.temperature}
              onChange={(e) => setNewPrepEntry(prev => ({ ...prev, temperature: e.target.value }))}
              className="w-full p-2 border rounded"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Chef Name *</label>
            <select
              value={newPrepEntry.preparedBy}
              onChange={(e) => setNewPrepEntry(prev => ({ ...prev, preparedBy: e.target.value }))}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="Vasanth">Vasanth</option>
              <option value="Swetha">Swetha</option>
              <option value="Sravanthi">Sravanthi</option>
              <option value="Asritha">Asritha</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Notes</label>
          <textarea
            value={newPrepEntry.notes}
            onChange={(e) => setNewPrepEntry(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full p-2 border rounded"
            rows="2"
            placeholder="Any special notes about this prep..."
          />
        </div>

        {/* Live Calculations Display */}
        {newPrepEntry.dishName && newPrepEntry.cookedWeight && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-sm text-green-800">
                <strong>Total Portions:</strong>
                <span className="text-lg font-bold ml-2">
                  {newPrepEntry.totalPortions || 0}
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm text-blue-800">
                <strong>Cost:</strong>
                <span className="text-lg font-bold ml-2">
                  £{calculateDishCost(newPrepEntry.dishName, parseFloat(newPrepEntry.cookedWeight) || 0).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-50 rounded border border-purple-200">
              <div className="text-sm text-purple-800">
                <strong>Per Portion:</strong>
                <span className="text-lg font-bold ml-2">
                  £{newPrepEntry.totalPortions && parseInt(newPrepEntry.totalPortions) > 0
                    ? (calculateDishCost(newPrepEntry.dishName, parseFloat(newPrepEntry.cookedWeight) || 0) / parseInt(newPrepEntry.totalPortions)).toFixed(2)
                    : '0.00'}
                </span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handlePrepSubmit}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500"
        >
          <Plus size={16} className="inline mr-1" />
          Add to Prep Log
        </button>
      </div>

      {/* Prep Log Table with Enhanced Data */}
      {prepLog && prepLog.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Today's Prep Log with Performance Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Time</th>
                  <th className="px-4 py-2 text-left">Dish</th>
                  <th className="px-4 py-2 text-left">Raw→Cooked</th>
                  <th className="px-4 py-2 text-left">Yield</th>
                  <th className="px-4 py-2 text-left">Container</th>
                  <th className="px-4 py-2 text-left">Portions</th>
                  <th className="px-4 py-2 text-left">Chef</th>
                  <th className="px-4 py-2 text-left">Age</th>
                  <th className="px-4 py-2 text-left">Cost</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prepLog.map(prep => {
                  const prepTime = new Date(prep.timestamp || prep.date);
                  const now = new Date();
                  const ageInHours = Math.floor((now - prepTime) / (1000 * 60 * 60));
                  const ageInDays = Math.floor(ageInHours / 24);

                  let ageDisplay, ageColor;
                  if (ageInDays > 0) {
                    ageDisplay = `${ageInDays}d`;
                    ageColor = ageInDays >= 2 ? 'text-red-600' : 'text-orange-600';
                  } else {
                    ageDisplay = `${ageInHours}h`;
                    ageColor = 'text-green-600';
                  }

                  // Yield performance indicator
                  const metadata = getRecipeMetadata(prep.dishName);
                  const yieldDiff = metadata && metadata.yield && prep.actualYield
                    ? prep.actualYield - metadata.yield
                    : 0;

                  return (
                    <tr key={prep.id} className={
                      prep.processed ? 'bg-green-50' :
                      ageInDays >= 2 ? 'bg-red-50' :
                      ageInDays >= 1 ? 'bg-yellow-50' :
                      'bg-white'
                    }>
                      <td className="px-4 py-2 text-sm">{prep.prepTime || '-'}</td>
                      <td className="px-4 py-2 font-medium">{prep.dishName}</td>
                      <td className="px-4 py-2 text-sm">
                        {prep.rawWeight || '-'}kg → {prep.quantityCooked}kg
                      </td>
                      <td className="px-4 py-2">
                        <span className={`font-medium ${
                          yieldDiff > 5 ? 'text-green-600' :
                          yieldDiff < -5 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {prep.actualYield || '-'}%
                          {yieldDiff !== 0 && (
                            <span className="text-xs ml-1">
                              ({yieldDiff > 0 ? '+' : ''}{yieldDiff.toFixed(1)})
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                          {prep.containerSize}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="font-bold text-green-600">{prep.totalPortions}p</span>
                      </td>
                      <td className="px-4 py-2">{prep.preparedBy}</td>
                      <td className="px-4 py-2">
                        <span className={`font-medium ${ageColor}`}>
                          {ageDisplay}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        £{prep.cost?.toFixed(2) || calculateDishCost(prep.dishName, prep.quantityCooked).toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        {prep.processed ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Dispatched</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Ready</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {!prep.processed && (
                          <button
                            onClick={() => handleDeletePrepItem(prep.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            <Trash2 size={14} className="inline mr-1" />
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPrepLog;
