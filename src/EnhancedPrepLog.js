// EnhancedPrepLog.js - DATABASE INTEGRATED VERSION
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  ChefHat, Plus, Calculator, AlertTriangle, CheckCircle,
  TrendingUp, Clock, Package, Trash2, Info, Calendar, AlertCircle
} from 'lucide-react';

const EnhancedPrepLog = ({
  prepLog,
  setPrepLog,
  recipes,
  inventory,
  setInventory,
  sales,
  calculateDishCost,
  checkIngredientAvailability,
  getAllDishNames
}) => {
  // State for recipe bank data
  const [recipeBank, setRecipeBank] = useState([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);

  // Generate batch number
  const generateBatchNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `B${year}${month}${day}-${hour}${minute}-${random}`;
  };

  // Calculate expiry date based on days selected
  const calculateExpiryDateFromDays = (prepDate, daysToAdd) => {
    const date = new Date(prepDate);
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString();
  };

  // Get default expiry days based on dish type
  const getDefaultExpiryDays = (dishName) => {
    const expiryDays = {
      'Biryani': 3,
      'Curry': 4,
      'Pakora': 2,
      'Samosa': 2,
      'Bhaji': 2,
      'Salan': 4,
      'Raitha': 3,
      'default': 3
    };

    for (const [category, days] of Object.entries(expiryDays)) {
      if (dishName.toLowerCase().includes(category.toLowerCase())) {
        return days;
      }
    }
    return expiryDays.default;
  };

  // Format date and time for display
  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format date for label printing
  const formatDateForLabel = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
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

  // Load recipe bank data from Supabase on mount
  useEffect(() => {
    const loadRecipeBank = async () => {
      try {
        setLoadingRecipes(true);
        const { data, error } = await supabase
          .from('recipe_bank')
          .select('*')
          .order('dish_name');

        if (error) throw error;

        if (data) {
          setRecipeBank(data);
          console.log('Loaded recipe bank:', data.length, 'recipes');
        }
      } catch (error) {
        console.error('Error loading recipe bank:', error);
      } finally {
        setLoadingRecipes(false);
      }
    };

    loadRecipeBank();
  }, []);

  // Get recipe data from database ONLY (no localStorage)
  const getRecipeFromDatabase = async (dishName) => {
    try {
      // First check if we already have it in state
      let recipe = recipeBank.find(r => r.dish_name === dishName);

      // If not in cache, fetch from database
      if (!recipe) {
        const { data, error } = await supabase
          .from('recipe_bank')
          .select('*')
          .eq('dish_name', dishName)
          .single();

        if (error) throw error;

        if (data) {
          recipe = data;
          // Update local cache
          setRecipeBank(prev => {
            const exists = prev.find(r => r.dish_name === dishName);
            if (!exists) {
              return [...prev, data];
            }
            return prev;
          });
        }
      }

      if (recipe) {
        // Return the actual database fields
        return {
          dishName: recipe.dish_name,
          rawWeight: recipe.raw_weight || 5,
          cookedWeight: recipe.cooked_weight || 4.5,
          containerSize: recipe.container_size || '500ml',
          totalPortions: recipe.total_portions || 30,
          portionsPerKg: recipe.portions_per_kg || 6,
          portionSize: recipe.portion_size || 167,
          category: recipe.category || 'Main Course',
          preparationTime: recipe.preparation_time,
          notes: recipe.notes,
          ingredients: recipe.ingredients,
          costPerKg: recipe.cost_per_kg || 0
        };
      }

      // Return defaults if nothing found
      return {
        dishName: dishName,
        rawWeight: 5,
        cookedWeight: 4.5,
        containerSize: '500ml',
        totalPortions: 30,
        portionsPerKg: 6,
        portionSize: 167,
        category: 'Main Course'
      };
    } catch (error) {
      console.error('Error loading recipe data:', error);
      return null;
    }
  };

  // Parse ingredients to deduct from inventory
  const safeParseIngredients = (ingredients) => {
    if (!ingredients || ingredients === '[]') return [];
    if (Array.isArray(ingredients)) return ingredients;
    if (typeof ingredients === 'string') {
      try {
        return JSON.parse(ingredients);
      } catch (e) {
        console.error('Error parsing ingredients:', e);
        return [];
      }
    }
    return [];
  };

  // Deduct ingredients from inventory based on recipe
  const deductIngredientsFromInventory = async (dishName, actualRawWeight) => {
    try {
      const recipe = await getRecipeFromDatabase(dishName);
      if (!recipe || !recipe.ingredients) return;

      const ingredients = safeParseIngredients(recipe.ingredients);
      if (ingredients.length === 0) return;

      // Calculate scaling factor
      const scalingFactor = actualRawWeight / (recipe.rawWeight || 1);

      // Update inventory for each ingredient
      const updatedInventory = [...inventory];
      const deductions = [];

      for (const ingredient of ingredients) {
        const inventoryItem = updatedInventory.find(item =>
          item.name === ingredient.item
        );

        if (inventoryItem) {
          const amountToDeduct = (ingredient.quantity || 0) * scalingFactor;

          // Calculate current stock
          const currentStock = (inventoryItem.openingStock || 0) +
                              (inventoryItem.receivedThisWeek || 0) -
                              (inventoryItem.usedThisWeek || 0);

          // Update used amount
          inventoryItem.usedThisWeek = (inventoryItem.usedThisWeek || 0) + amountToDeduct;

          deductions.push({
            item: ingredient.item,
            amount: amountToDeduct,
            unit: ingredient.unit,
            remainingStock: currentStock - amountToDeduct
          });

          console.log(`Deducted ${amountToDeduct} ${ingredient.unit} of ${ingredient.item}`);
        }
      }

      // Update local inventory state
      setInventory(updatedInventory);

      // TODO: Save inventory updates to database if you have an inventory table

      return deductions;
    } catch (error) {
      console.error('Error deducting inventory:', error);
    }
  };

  // Enhanced prep entry state with flexible expiry
  const [newPrepEntry, setNewPrepEntry] = useState({
    dishName: '',
    rawWeight: '',
    cookedWeight: '',
    actualYield: '',
    containerSize: '',
    portionSize: '',
    portionsPerKg: '',
    totalPortions: '',
    preparedBy: 'Vasanth',
    temperature: '',
    notes: '',
    recipeData: null, // Store the recipe data
    autoCalculate: true,
    batchNumber: generateBatchNumber(),
    expiryDays: 3,
    expiryDateMethod: 'days',
    customExpiryDate: '',
    calculatedExpiryDate: ''
  });

  // Smart suggestions state
  const [prepSuggestions, setPrepSuggestions] = useState([]);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Calculate prep suggestion
  const calculatePrepSuggestion = async (dishName) => {
    const recipeData = await getRecipeFromDatabase(dishName);
    if (!recipeData) return null;

    const last7DaysSales = sales.filter(s => {
      if (!s || !s.date) return false;
      const saleDate = new Date(s.date);
      const daysAgo = (new Date() - saleDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7 && s.dishName === dishName;
    });

    let avgDailySales = 20;
    if (last7DaysSales.length > 0) {
      const totalSold = last7DaysSales.reduce((sum, s) =>
        sum + ((s.receivedPortions || 0) - (s.remainingPortions || 0)), 0
      );
      avgDailySales = Math.round(totalSold / 7);
    }

    const dayMultiplier = {
      0: 1.3, 1: 0.8, 2: 0.9, 3: 0.9, 4: 1.0, 5: 1.2, 6: 1.3
    };

    const today = new Date().getDay();
    const todayMultiplier = dayMultiplier[today] || 1;

    const currentStock = sales
      .filter(s => s && s.dishName === dishName && !s.endOfDay)
      .reduce((sum, s) => sum + (s.remainingPortions || 0), 0);

    const oldStock = sales
      .filter(s => s && s.dishName === dishName && s.endOfDay && s.finalStock > 0)
      .reduce((sum, s) => sum + (s.finalStock || 0), 0);

    const totalStock = currentStock + oldStock;
    const expectedDemand = Math.ceil(avgDailySales * todayMultiplier * 1.1);
    const needToPrepare = Math.max(0, expectedDemand - totalStock);
    const kgToPrepare = Math.ceil((needToPrepare / (recipeData.portionsPerKg || 8)) * 10) / 10;

    // Calculate raw weight needed based on recipe yield
    const yieldPercentage = (recipeData.cookedWeight / recipeData.rawWeight) * 100;
    const rawWeightNeeded = (kgToPrepare / (yieldPercentage / 100)).toFixed(1);

    return {
      dishName,
      recipeData,
      avgDailySales,
      currentStock,
      oldStock,
      totalStock,
      expectedDemand,
      needToPrepare,
      kgToPrepare,
      rawWeightNeeded,
      totalPortions: Math.floor(kgToPrepare * (recipeData.portionsPerKg || 8)),
      priority: needToPrepare > expectedDemand * 0.5 ? 'high' :
               needToPrepare > 0 ? 'medium' : 'low'
    };
  };

  // Update calculated expiry date when method or days change
  useEffect(() => {
    if (newPrepEntry.expiryDateMethod === 'days') {
      const now = new Date();
      const expiryDate = calculateExpiryDateFromDays(now, parseInt(newPrepEntry.expiryDays));
      setNewPrepEntry(prev => ({
        ...prev,
        calculatedExpiryDate: expiryDate
      }));
    } else if (newPrepEntry.customExpiryDate) {
      setNewPrepEntry(prev => ({
        ...prev,
        calculatedExpiryDate: new Date(newPrepEntry.customExpiryDate).toISOString()
      }));
    }
  }, [newPrepEntry.expiryDays, newPrepEntry.expiryDateMethod, newPrepEntry.customExpiryDate]);

  // Auto-fill from recipe selection - FETCH FROM DATABASE
  const handleDishSelection = async (dishName) => {
    if (!dishName) return;

    const newBatchNumber = generateBatchNumber();
    const defaultExpiryDays = getDefaultExpiryDays(dishName);

    // Show loading state
    setNewPrepEntry(prev => ({
      ...prev,
      dishName,
      notes: 'Loading recipe data...',
      batchNumber: newBatchNumber,
      expiryDays: defaultExpiryDays
    }));

    // Fetch recipe from database
    const recipeData = await getRecipeFromDatabase(dishName);

    if (recipeData) {
      console.log('Loaded recipe from database:', dishName, recipeData);

      const now = new Date();
      const calculatedExpiry = calculateExpiryDateFromDays(now, defaultExpiryDays);

      setNewPrepEntry({
        dishName,
        rawWeight: '',
        cookedWeight: '',
        actualYield: '',
        containerSize: recipeData.containerSize || '500ml',
        portionSize: recipeData.portionSize?.toString() || '167',
        portionsPerKg: recipeData.portionsPerKg?.toString() || '6',
        totalPortions: '',
        preparedBy: newPrepEntry.preparedBy,
        temperature: '',
        notes: `Recipe: ${recipeData.rawWeight}kg raw → ${recipeData.cookedWeight}kg cooked (${recipeData.totalPortions} portions)`,
        recipeData: recipeData, // Store the full recipe data
        autoCalculate: true,
        batchNumber: newBatchNumber,
        expiryDays: defaultExpiryDays,
        expiryDateMethod: 'days',
        customExpiryDate: '',
        calculatedExpiryDate: calculatedExpiry
      });
    } else {
      // Default values if no recipe found
      const now = new Date();
      const calculatedExpiry = calculateExpiryDateFromDays(now, 3);

      setNewPrepEntry({
        dishName,
        rawWeight: '',
        cookedWeight: '',
        actualYield: '',
        containerSize: '500ml',
        portionSize: '167',
        portionsPerKg: '6',
        totalPortions: '',
        preparedBy: newPrepEntry.preparedBy,
        temperature: '',
        notes: 'No recipe found - using defaults',
        recipeData: null,
        autoCalculate: false,
        batchNumber: newBatchNumber,
        expiryDays: 3,
        expiryDateMethod: 'days',
        customExpiryDate: '',
        calculatedExpiryDate: calculatedExpiry
      });
    }
  };

  // Handle raw weight change with PROPORTIONAL calculations from Recipe Bank
  const handleRawWeightChange = (weight) => {
    if (!weight) {
      setNewPrepEntry(prev => ({
        ...prev,
        rawWeight: '',
        cookedWeight: '',
        actualYield: '',
        totalPortions: ''
      }));
      return;
    }

    const rawWeightNum = parseFloat(weight);

    if (newPrepEntry.autoCalculate && newPrepEntry.recipeData) {
      const recipe = newPrepEntry.recipeData;

      // Calculate scaling factor based on recipe's raw weight
      const scalingFactor = rawWeightNum / recipe.rawWeight;

      // Scale everything proportionally
      const cookedWeight = (recipe.cookedWeight * scalingFactor).toFixed(2);
      const totalPortions = Math.round(recipe.totalPortions * scalingFactor);
      const yieldPercentage = ((parseFloat(cookedWeight) / rawWeightNum) * 100).toFixed(1);

      setNewPrepEntry(prev => ({
        ...prev,
        rawWeight: weight,
        cookedWeight: cookedWeight,
        actualYield: yieldPercentage,
        totalPortions: totalPortions.toString(),
        notes: `Scaled from recipe: ${recipe.rawWeight}kg → ${rawWeightNum}kg (${(scalingFactor * 100).toFixed(0)}% of original)`
      }));
    } else {
      setNewPrepEntry(prev => ({
        ...prev,
        rawWeight: weight
      }));
    }
  };

  // Handle manual cooked weight change
  const handleCookedWeightChange = (weight) => {
    if (!weight) {
      setNewPrepEntry(prev => ({
        ...prev,
        cookedWeight: '',
        totalPortions: '',
        actualYield: ''
      }));
      return;
    }

    const cookedWeightNum = parseFloat(weight);
    let actualYield = '';
    if (newPrepEntry.rawWeight) {
      actualYield = ((cookedWeightNum / parseFloat(newPrepEntry.rawWeight)) * 100).toFixed(1);
    }

    // Calculate portions based on portions per kg from recipe
    const portionsPerKg = parseFloat(newPrepEntry.portionsPerKg || 6);
    const totalPortions = Math.round(cookedWeightNum * portionsPerKg);

    setNewPrepEntry(prev => ({
      ...prev,
      cookedWeight: weight,
      actualYield: actualYield,
      totalPortions: totalPortions.toString(),
      autoCalculate: false
    }));
  };

  // Toggle auto-calculate mode
  const toggleAutoCalculate = (enabled) => {
    setNewPrepEntry(prev => ({
      ...prev,
      autoCalculate: enabled
    }));

    if (enabled && newPrepEntry.rawWeight && newPrepEntry.recipeData) {
      handleRawWeightChange(newPrepEntry.rawWeight);
    }
  };

  // Submit prep entry to database and update inventory
  const handlePrepSubmit = async () => {
    if (newPrepEntry.dishName && newPrepEntry.cookedWeight && newPrepEntry.totalPortions) {
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

      const now = new Date();
      const expiryDate = newPrepEntry.calculatedExpiryDate ||
                        calculateExpiryDateFromDays(now, parseInt(newPrepEntry.expiryDays));

      try {
        // Deduct ingredients from inventory
        const deductions = await deductIngredientsFromInventory(
          newPrepEntry.dishName,
          parseFloat(newPrepEntry.rawWeight || newPrepEntry.cookedWeight)
        );

        // Save to database
        const dbEntry = {
          dish_name: newPrepEntry.dishName,
          quantity_cooked: parseFloat(newPrepEntry.cookedWeight),
          prepared_by: newPrepEntry.preparedBy,
          portion_size: parseInt(newPrepEntry.portionSize) || 167,
          container_size: newPrepEntry.containerSize || '500ml',
          total_portions: parseInt(newPrepEntry.totalPortions),
          processed: false,
          batch_number: newPrepEntry.batchNumber,
          date_made: now.toISOString(),
          expiry_date: expiryDate
        };

        // Add optional fields if they exist
        if (newPrepEntry.rawWeight) {
          dbEntry.raw_weight = parseFloat(newPrepEntry.rawWeight);
        }
        if (newPrepEntry.actualYield) {
          dbEntry.actual_yield = parseFloat(newPrepEntry.actualYield);
        }
        if (newPrepEntry.temperature) {
          dbEntry.temperature = parseFloat(newPrepEntry.temperature);
        }
        if (newPrepEntry.notes) {
          dbEntry.notes = newPrepEntry.notes;
        }

        const { data, error } = await supabase
          .from('prep_log')
          .insert([dbEntry])
          .select()
          .single();

        if (error) throw error;

        // Create local entry using the returned data
        const newEntry = {
          id: data.id,
          batchNumber: data.batch_number || newPrepEntry.batchNumber,
          date: data.created_at ? data.created_at.split('T')[0] : now.toISOString().split('T')[0],
          timestamp: data.created_at || now.toISOString(),
          dateMade: data.date_made || data.created_at || now.toISOString(),
          expiryDate: data.expiry_date || expiryDate,
          dishName: data.dish_name,
          rawWeight: data.raw_weight || parseFloat(newPrepEntry.rawWeight) || 0,
          quantityCooked: data.quantity_cooked,
          actualYield: data.actual_yield || parseFloat(newPrepEntry.actualYield) || 0,
          preparedBy: data.prepared_by,
          portionSize: data.portion_size,
          containerSize: data.container_size,
          totalPortions: data.total_portions,
          temperature: data.temperature,
          notes: data.notes,
          processed: data.processed || false,
          cost: calculateDishCost(newPrepEntry.dishName, parseFloat(newPrepEntry.cookedWeight))
        };

        // Update local state
        setPrepLog(prev => [...prev, newEntry]);

        // Show inventory deductions in alert
        let inventoryMsg = '';
        if (deductions && deductions.length > 0) {
          inventoryMsg = '\n\n📦 INVENTORY UPDATED:\n' +
            deductions.map(d =>
              `• ${d.item}: -${d.amount.toFixed(2)} ${d.unit} (${d.remainingStock.toFixed(2)} left)`
            ).join('\n');
        }

        // Enhanced alert with label information
        alert(`✅ Successfully added ${newEntry.totalPortions} portions of ${newEntry.dishName}!\n\n` +
              `🏷️ LABEL INFORMATION:\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `📦 Batch: ${newEntry.batchNumber}\n` +
              `🍛 Dish: ${newEntry.dishName}\n` +
              `📅 Made: ${formatDateForLabel(newEntry.dateMade)}\n` +
              `⏰ USE BY: ${formatDateForLabel(newEntry.expiryDate)}\n` +
              `📐 Container: ${newEntry.containerSize}\n` +
              `⚖️ Portion: ${newEntry.portionSize}g\n` +
              `👨‍🍳 Chef: ${newEntry.preparedBy}\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `💾 Saved to database with ID: ${data.id}` +
              inventoryMsg);

        // Reset form
        setNewPrepEntry({
          dishName: '',
          rawWeight: '',
          cookedWeight: '',
          actualYield: '',
          containerSize: '',
          portionSize: '',
          portionsPerKg: '',
          totalPortions: '',
          preparedBy: newPrepEntry.preparedBy,
          temperature: '',
          notes: '',
          recipeData: null,
          autoCalculate: true,
          batchNumber: generateBatchNumber(),
          expiryDays: 3,
          expiryDateMethod: 'days',
          customExpiryDate: '',
          calculatedExpiryDate: ''
        });

      } catch (error) {
        console.error('Error saving to database:', error);
        alert('❌ Error saving to database: ' + error.message);
      }
    } else {
      alert('❌ Please fill in all required fields');
    }
  };

  // Delete prep item from database
  const handleDeletePrepItem = async (prepId) => {
    const prepItem = prepLog.find(p => p.id === prepId);
    if (!prepItem) return;

    if (prepItem.processed) {
      alert('❌ Cannot delete dispatched items!');
      return;
    }

    if (window.confirm(`Delete ${prepItem.dishName} (${prepItem.totalPortions} portions)?\nBatch: ${prepItem.batchNumber}`)) {
      try {
        const { error } = await supabase
          .from('prep_log')
          .delete()
          .eq('id', prepId);

        if (error) throw error;

        setPrepLog(prev => prev.filter(p => p.id !== prepId));

        alert('✅ Prep entry deleted from database successfully');
      } catch (error) {
        console.error('Error deleting from database:', error);
        alert('❌ Error deleting from database: ' + error.message);
      }
    }
  };

  // Generate suggestions on mount
  useEffect(() => {
    const loadSuggestions = async () => {
      const dishes = getAllDishNames();
      if (dishes.length > 0) {
        const suggestionPromises = dishes.map(dish => calculatePrepSuggestion(dish));
        const allSuggestions = await Promise.all(suggestionPromises);

        const validSuggestions = allSuggestions
          .filter(s => s && s.kgToPrepare > 0)
          .sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          });

        setPrepSuggestions(validSuggestions);
      }
    };

    loadSuggestions();
  }, [sales, prepLog, getAllDishNames]);

  const availableDishes = getAllDishNames();

  if (availableDishes.length === 0 && !loadingRecipes) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <ChefHat className="mr-2" /> Smart Prep Planning
        </h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 text-yellow-600" size={48} />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">No Recipes Available</h3>
          <p className="text-yellow-700 mb-4">
            Your recipes need to be configured in the Recipe Bank first.
          </p>
          <div className="text-left max-w-md mx-auto">
            <p className="text-sm text-yellow-700 mb-2">To fix this:</p>
            <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
              <li>Go to Recipe Bank</li>
              <li>Add or edit recipes with portion details</li>
              <li>Make sure recipes are saved to database</li>
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
        <ChefHat className="mr-2" /> Smart Prep Planning with Recipe Bank Integration
      </h2>

      {/* Expiry Alerts */}
      {prepLog.filter(p => !p.processed && p.expiryDate).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-3 flex items-center">
            <AlertCircle className="mr-2" /> Expiry Alerts - Use These First!
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {prepLog
              .filter(p => !p.processed && p.expiryDate)
              .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate))
              .slice(0, 6)
              .map(prep => {
                const expiryStatus = getExpiryStatus(prep.expiryDate);
                return (
                  <div key={prep.id} className={`p-3 rounded-lg border-2 ${
                    expiryStatus.status === 'expired' ? 'bg-red-100 border-red-400' :
                    expiryStatus.status === 'urgent' ? 'bg-orange-100 border-orange-400' :
                    expiryStatus.status === 'warning' ? 'bg-yellow-100 border-yellow-400' :
                    'bg-green-50 border-green-300'
                  }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold">{prep.dishName}</div>
                        <div className="text-sm">Batch: {prep.batchNumber}</div>
                        <div className="text-xs text-gray-600">
                          Made: {formatDateTime(prep.dateMade)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-${expiryStatus.color}-600`}>
                          {expiryStatus.message}
                        </div>
                        <div className="text-sm">{prep.totalPortions}p</div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

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
                onClick={async () => {
                  await handleDishSelection(suggestion.dishName);
                  handleRawWeightChange(suggestion.rawWeightNeeded);
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
                    {showDetailedAnalysis && suggestion.recipeData && (
                      <div className="mt-2 text-xs text-gray-500">
                        Recipe: {suggestion.recipeData.rawWeight}kg → {suggestion.recipeData.cookedWeight}kg |
                        Container: {suggestion.recipeData.containerSize} |
                        Portion: {suggestion.recipeData.portionSize}g
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      Prep {suggestion.kgToPrepare} kg
                    </div>
                    <div className="text-sm text-gray-600">
                      Raw needed: {suggestion.rawWeightNeeded} kg
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
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            🧑‍🍳 Add New Prep Entry - Batch #{newPrepEntry.batchNumber}
          </h3>

          <div className="flex items-center space-x-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={newPrepEntry.autoCalculate}
                onChange={(e) => toggleAutoCalculate(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium flex items-center">
                <Calculator className="mr-1" size={16} />
                Auto-Calculate from Recipe Bank
              </span>
            </label>
          </div>
        </div>

        {/* Recipe Info Display */}
        {newPrepEntry.recipeData && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm">
              <strong>Recipe Bank Configuration:</strong>
              <span className="ml-3">Raw: {newPrepEntry.recipeData.rawWeight}kg</span>
              <span className="ml-3">Cooked: {newPrepEntry.recipeData.cookedWeight}kg</span>
              <span className="ml-3">Total: {newPrepEntry.recipeData.totalPortions} portions</span>
              <span className="ml-3">({newPrepEntry.recipeData.portionsPerKg} portions/kg)</span>
            </div>
          </div>
        )}

        {/* Batch Info Banner with Integrated Compact Label */}
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Package className="mr-2 text-purple-600" size={20} />
              <div className="text-sm">
                <strong>Batch Number:</strong> {newPrepEntry.batchNumber}
                <span className="ml-4"><strong>Date/Time:</strong> {formatDateTime(new Date())}</span>
              </div>
            </div>
          </div>

          {/* Compact Label Preview - Inline */}
          {newPrepEntry.calculatedExpiryDate && newPrepEntry.dishName && (
            <div className="mt-2 p-2 bg-white border border-gray-400 rounded text-xs font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="font-bold text-base">{newPrepEntry.dishName}</span>
                  <span className="text-purple-600">Batch: {newPrepEntry.batchNumber}</span>
                  <span>Made: {formatDateForLabel(new Date())}</span>
                  <span className="font-bold text-red-600 bg-red-100 px-1 rounded">
                    USE BY: {formatDateForLabel(newPrepEntry.calculatedExpiryDate)}
                  </span>
                  <span className="text-gray-600">
                    {newPrepEntry.containerSize} | {newPrepEntry.portionSize}g | {newPrepEntry.preparedBy}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const labelText = `${newPrepEntry.dishName}\nBATCH: ${newPrepEntry.batchNumber}\nMADE: ${formatDateForLabel(new Date())}\nUSE BY: ${formatDateForLabel(newPrepEntry.calculatedExpiryDate)}\n${newPrepEntry.containerSize} | ${newPrepEntry.portionSize}g | ${newPrepEntry.preparedBy}`;
                    navigator.clipboard.writeText(labelText.trim());
                    alert('📋 Label text copied!');
                  }}
                  className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                >
                  📋 Copy
                </button>
              </div>
            </div>
          )}

          {/* Expiry Date Selection */}
          <div className="mt-3 pt-3 border-t border-purple-200">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="days"
                  checked={newPrepEntry.expiryDateMethod === 'days'}
                  onChange={(e) => setNewPrepEntry(prev => ({
                    ...prev,
                    expiryDateMethod: 'days',
                    customExpiryDate: ''
                  }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Expiry in Days</span>
              </label>

              <label className="flex items-center">
                <input
                  type="radio"
                  value="date"
                  checked={newPrepEntry.expiryDateMethod === 'date'}
                  onChange={(e) => setNewPrepEntry(prev => ({
                    ...prev,
                    expiryDateMethod: 'date'
                  }))}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Custom Expiry Date</span>
              </label>
            </div>

            <div className="mt-3 flex items-center space-x-4">
              {newPrepEntry.expiryDateMethod === 'days' ? (
                <>
                  <div>
                    <label className="text-sm font-medium mr-2">Days until expiry:</label>
                    <select
                      value={newPrepEntry.expiryDays}
                      onChange={(e) => setNewPrepEntry(prev => ({
                        ...prev,
                        expiryDays: parseInt(e.target.value)
                      }))}
                      className="px-3 py-1 border rounded"
                    >
                      <option value="1">1 Day</option>
                      <option value="2">2 Days</option>
                      <option value="3">3 Days</option>
                      <option value="4">4 Days</option>
                      <option value="5">5 Days</option>
                      <option value="7">7 Days</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-sm font-medium mr-2">Select expiry date:</label>
                  <input
                    type="date"
                    value={newPrepEntry.customExpiryDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewPrepEntry(prev => ({
                      ...prev,
                      customExpiryDate: e.target.value
                    }))}
                    className="px-3 py-1 border rounded"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Recipe *
            </label>
            <select
              value={newPrepEntry.dishName}
              onChange={(e) => handleDishSelection(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={loadingRecipes}
            >
              <option value="">
                {loadingRecipes ? 'Loading recipes...' : 'Select Dish'}
              </option>
              {getAllDishNames().map(dish => (
                <option key={dish} value={dish}>{dish}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Raw Weight (kg) {newPrepEntry.autoCalculate && '*'}
            </label>
            <input
              type="number"
              step="0.1"
              value={newPrepEntry.rawWeight}
              onChange={(e) => handleRawWeightChange(e.target.value)}
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                newPrepEntry.autoCalculate ? 'bg-yellow-50 border-yellow-300' : ''
              }`}
              placeholder="Enter raw weight"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cooked Weight (kg) *
              {newPrepEntry.autoCalculate && (
                <span className="text-xs text-green-600 ml-2">
                  <Calculator className="inline" size={12} /> Auto-calculated
                </span>
              )}
            </label>
            <input
              type="number"
              step="0.1"
              value={newPrepEntry.cookedWeight}
              onChange={(e) => handleCookedWeightChange(e.target.value)}
              className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                newPrepEntry.autoCalculate ? 'bg-green-50 border-green-300' : ''
              }`}
              placeholder={newPrepEntry.autoCalculate ? "Auto-calculated" : "Enter cooked weight"}
              readOnly={newPrepEntry.autoCalculate && !!newPrepEntry.recipeData}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Actual Yield %
            </label>
            <div className={`p-2 border rounded ${
              newPrepEntry.actualYield && newPrepEntry.recipeData
                ? Math.abs(parseFloat(newPrepEntry.actualYield) -
                  ((newPrepEntry.recipeData.cookedWeight / newPrepEntry.recipeData.rawWeight) * 100)) > 5
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-gray-100'
                : 'bg-gray-100'
            }`}>
              {newPrepEntry.actualYield || '-'}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Container Size</label>
            <input
              type="text"
              value={newPrepEntry.containerSize}
              onChange={(e) => setNewPrepEntry(prev => ({ ...prev, containerSize: e.target.value }))}
              className="w-full p-2 border rounded bg-gray-100"
              placeholder="From Recipe Bank"
              readOnly={newPrepEntry.autoCalculate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Portion Size (g)</label>
            <input
              type="number"
              value={newPrepEntry.portionSize}
              onChange={(e) => setNewPrepEntry(prev => ({ ...prev, portionSize: e.target.value }))}
              className="w-full p-2 border rounded bg-gray-100"
              placeholder="From Recipe Bank"
              readOnly={newPrepEntry.autoCalculate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Portions/kg</label>
            <input
              type="number"
              step="0.1"
              value={newPrepEntry.portionsPerKg}
              onChange={(e) => setNewPrepEntry(prev => ({ ...prev, portionsPerKg: e.target.value }))}
              className="w-full p-2 border rounded bg-gray-100"
              placeholder="From Recipe Bank"
              readOnly={newPrepEntry.autoCalculate}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Total Portions
            </label>
            <input
              type="text"
              value={newPrepEntry.totalPortions}
              className="w-full p-2 border rounded font-bold bg-green-50 text-green-600"
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
              className="w-full p-2 border rounded"
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
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus size={16} className="inline mr-1" />
          Add to Prep Log (Updates Inventory)
        </button>
      </div>

      {/* Prep Log Table */}
      {prepLog && prepLog.length > 0 && (
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Prep Log with Batch Tracking (From Database)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Batch #</th>
                  <th className="px-4 py-2 text-left">Made</th>
                  <th className="px-4 py-2 text-left">Dish</th>
                  <th className="px-4 py-2 text-left">Weight</th>
                  <th className="px-4 py-2 text-left">Container</th>
                  <th className="px-4 py-2 text-left">Portions</th>
                  <th className="px-4 py-2 text-left">Chef</th>
                  <th className="px-4 py-2 text-left">Expires</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prepLog
                  .sort((a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date))
                  .map(prep => {
                    const expiryStatus = getExpiryStatus(prep.expiryDate);

                    return (
                      <tr key={prep.id} className={
                        prep.processed ? 'bg-green-50' :
                        expiryStatus.status === 'expired' ? 'bg-red-50' :
                        expiryStatus.status === 'urgent' ? 'bg-orange-50' :
                        expiryStatus.status === 'warning' ? 'bg-yellow-50' :
                        'bg-white'
                      }>
                        <td className="px-4 py-2">
                          <span className="font-mono text-sm font-bold text-purple-600">
                            {prep.batchNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {formatDateTime(prep.dateMade || prep.timestamp || prep.date)}
                        </td>
                        <td className="px-4 py-2 font-medium">{prep.dishName}</td>
                        <td className="px-4 py-2 text-sm">
                          {prep.rawWeight || '-'}kg → {prep.quantityCooked}kg
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
                          {prep.expiryDate ? (
                            <div>
                              <div className={`font-medium text-${expiryStatus.color}-600`}>
                                {expiryStatus.message}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDateForLabel(prep.expiryDate)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {prep.processed ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              Dispatched
                            </span>
                          ) : expiryStatus.status === 'expired' ? (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                              EXPIRED
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                              Ready
                            </span>
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
