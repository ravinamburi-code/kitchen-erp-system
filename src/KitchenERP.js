import { supabase } from './supabaseClient';
import React, { useState, useEffect } from 'react';
import {
  ChefHat, Package, Truck, BarChart3, Calendar,
  ShoppingCart, AlertTriangle, DollarSign, Users,
  Plus, Edit, Trash2, Save, X, CheckCircle, FileText,
  TrendingUp, TrendingDown, Clock, Printer
} from 'lucide-react';

// Imports
import EnhancedRecipeBank from './EnhancedRecipeBank';
import EnhancedPrepLog from './EnhancedPrepLog';
import EnhancedDispatch from './EnhancedDispatch';
import EnhancedSales from './EnhancedSales';
import SmartPlanningDashboard from './SmartPlanningDashboard';
import OldStockOffersManager from './OldStockOffersManager';
import EnhancedMainDashboard from './EnhancedMainDashboard';
const KitchenERP = () => {

  // Load data from localStorage on mount
  const loadFromStorage = (key, defaultValue) => {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  };

  // Load data from database
  const loadFromDatabase = async (table, defaultValue) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*');

      if (error) throw error;
      return data || defaultValue;
    } catch (error) {
      console.error(`Error loading ${table}:`, error);
      // Fall back to localStorage
      return loadFromStorage(table, defaultValue);
    }
  };

  // In your main KitchenERP component, add these handlers:


  // Save to database function
  const saveToDatabase = async (table, data) => {
    try {
      const { error } = await supabase
        .from(table)
        .upsert(data);

      if (error) throw error;
    } catch (error) {
      console.error(`Error saving to ${table}:`, error);
    }
  };


  // Instead of hardcoded recipes, start with empty array
  const [recipes, setRecipes] = useState([]);

  const [allDishNames, setAllDishNames] = useState([]);



  // ADD this entire useEffect after your recipes loading useEffect:
  useEffect(() => {
    const loadAllDishNames = async () => {
      try {
        const { data, error } = await supabase
          .from('recipe_bank')
          .select('dish_name')
          .order('dish_name');

        if (error) throw error;

        if (data && data.length > 0) {
          const dishNames = data.map(d => d.dish_name).filter(name => name).sort();
          setAllDishNames(dishNames);
          localStorage.setItem('allDishNames', JSON.stringify(dishNames));
          console.log('Loaded', dishNames.length, 'dish names from database');
        }
      } catch (error) {
        console.error('Error loading dish names:', error);
      }
    };

    loadAllDishNames();
  }, []);

  // Load recipes from database
  useEffect(() => {
    const loadRecipesFromDatabase = async () => {
      try {
        console.log('Loading recipes from Supabase...');
        const { data, error } = await supabase
          .from('recipe_bank')
          .select('*')
          .order('dish_name');

        if (error) throw error;

        if (data) {
          // Convert database format to app format
          const formattedRecipes = [];
          let recipeId = 1;

          data.forEach(recipe => {
            if (recipe.ingredients && recipe.ingredients !== '[]') {
              const ingredients = JSON.parse(recipe.ingredients);
              ingredients.forEach(ing => {
                formattedRecipes.push({
                  id: recipeId++,
                  dishName: recipe.dish_name,
                  ingredient: ing.item,
                  quantityPer1kg: ing.quantity,
                  unit: ing.unit
                });
              });
            }
          });

          setRecipes(formattedRecipes);
          console.log('Loaded', formattedRecipes.length, 'recipe ingredients from', data.length, 'dishes');

          // Also store dish names for dropdowns
          const dishNames = data.map(d => d.dish_name).sort();
          localStorage.setItem('allDishNames', JSON.stringify(dishNames));
        }
      } catch (error) {
        console.error('Error loading recipes:', error);
      }
    };

    loadRecipesFromDatabase();
  }, []);




  // ✅ CLEAR PREP LOG
const [prepLog, setPrepLog] = useState(() => loadFromStorage('prepLog', []));

// ✅ CLEAR DISPATCH
const [dispatch, setDispatch] = useState(() => loadFromStorage('dispatch', []));

// ✅ CLEAR SALES
const [sales, setSales] = useState(() => loadFromStorage('sales', []));



// 4. AUTO-LOGIN CHECK (same as before)
useEffect(() => {
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    setCurrentUser(user);
    setUserRole(user.role);
    setIsLoggedIn(true);
    setShowRoleSelector(false);
  }
}, []);

  // Auto-save to localStorage whenever state changes

  // Around line 52-63 - KEEP THESE (DO NOT DELETE):
  const [showAddInventoryItem, setShowAddInventoryItem] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] = useState(null);

  const [newInventoryItem, setNewInventoryItem] = useState({
    name: '',
    unit: 'kg',
    openingStock: '',
    receivedThisWeek: '',
    reorderLevel: '',
    unitCost: '',
    supplier: 'Local Supplier',
    category: 'Dry Items'
  });

  const [inventory, setInventory] = useState([]);


  // 2. ADD this useEffect to load inventory from database (add after your other useEffects):
  useEffect(() => {
    const loadInventoryFromDatabase = async () => {
      try {
        console.log('Loading inventory from Supabase...');
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data && data.length > 0) {
          // Convert snake_case from DB to camelCase for app
          const formattedInventory = data.map(item => ({
            id: item.id,
            name: item.name,
            unit: item.unit,
            openingStock: parseFloat(item.opening_stock || 0),
            receivedThisWeek: parseFloat(item.received_this_week || 0),
            reorderLevel: parseFloat(item.reorder_level || 1),
            unitCost: parseFloat(item.unit_cost || 0),
            supplier: item.supplier || 'Local Supplier',
            category: item.category || 'Dry Items'
          }));

          setInventory(formattedInventory);
          console.log('Inventory loaded:', formattedInventory.length, 'items');
        } else {
          console.log('No inventory data in database');
        }
      } catch (error) {
        console.error('Error loading inventory:', error);
        // Fall back to localStorage if database fails
        const stored = localStorage.getItem('inventory');
        if (stored) {
          setInventory(JSON.parse(stored));
          console.log('Loaded inventory from localStorage as fallback');
        }
      }
    };

    loadInventoryFromDatabase();
  }, []); // Empty array = runs once on mount

  // 3. Also load other data from database - ADD/UPDATE this existing useEffect:
  useEffect(() => {
    const loadAllDataFromDatabase = async () => {
      console.log('Loading all data from Supabase...');

      // Load prep log
      try {
        const { data: prepData } = await supabase
          .from('prep_log')
          .select('*')
          .order('created_at', { ascending: false });

        if (prepData) {
          const formattedPrep = prepData.map(item => ({
            id: item.id,
            date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            timestamp: item.timestamp || item.created_at,
            prepTime: item.prep_time,
            dishName: item.dish_name,
            quantityCooked: parseFloat(item.quantity_cooked),
            preparedBy: item.prepared_by,
            portionSize: item.portion_size,
            containerSize: item.container_size,
            totalPortions: item.total_portions,
            processed: item.processed || false,
            status: item.status || 'fresh'
          }));
          setPrepLog(formattedPrep);
          console.log('Prep log loaded:', formattedPrep.length, 'items');
        }
      } catch (error) {
        console.error('Error loading prep log:', error);
      }

      // Load dispatch
      try {
        const { data: dispatchData } = await supabase
          .from('dispatch')
          .select('*')
          .order('created_at', { ascending: false });

        if (dispatchData) {
          const formattedDispatch = dispatchData.map(item => ({
            id: item.id,
            date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            dishName: item.dish_name,
            totalCooked: item.total_cooked,
            easthamSent: item.eastham_sent,
            bethnalSent: item.bethnal_sent,
            coldRoomStock: item.cold_room_stock
          }));
          setDispatch(formattedDispatch);
          console.log('Dispatch loaded:', formattedDispatch.length, 'items');
        }
      } catch (error) {
        console.error('Error loading dispatch:', error);
      }

      // Load sales
      try {
        const { data: salesData } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });

        if (salesData) {
          const formattedSales = salesData.map(item => ({
            id: item.id,
            dishName: item.dish_name,
            location: item.location,
            receivedPortions: item.received_portions,
            remainingPortions: item.remaining_portions,
            date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            time: new Date(item.created_at).toLocaleTimeString(),
            updatedBy: item.updated_by,
            autoCreated: item.auto_created || false,
            endOfDay: item.end_of_day || false,
            finalStock: item.final_stock || 0
          }));
          setSales(formattedSales);
          console.log('Sales loaded:', formattedSales.length, 'items');
        }
      } catch (error) {
        console.error('Error loading sales:', error);
      }

      // Load waste log
      try {
        const { data: wasteData } = await supabase
          .from('waste_log')
          .select('*')
          .order('created_at', { ascending: false });

        if (wasteData) {
          const formattedWaste = wasteData.map(item => ({
            id: item.id,
            date: item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            time: new Date(item.created_at).toLocaleTimeString(),
            dishName: item.dish_name,
            location: item.location,
            portions: item.portions,
            reason: item.reason,
            notes: item.notes,
            value: item.value
          }));
          setWasteLog(formattedWaste);
          console.log('Waste log loaded:', formattedWaste.length, 'items');
        }
      } catch (error) {
        console.error('Error loading waste log:', error);
      }
    };

    loadAllDataFromDatabase();
  }, []); // Run once on mount

  useEffect(() => {
    localStorage.setItem('recipes', JSON.stringify(recipes));
  }, [recipes]);

  useEffect(() => {
    localStorage.setItem('prepLog', JSON.stringify(prepLog));
  }, [prepLog]);

  useEffect(() => {
    localStorage.setItem('dispatch', JSON.stringify(dispatch));
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem('sales', JSON.stringify(sales));
  }, [sales]);

  // Load initial data from Supabase on app mount
useEffect(() => {
  const loadInitialData = async () => {
    console.log('Loading menu data from Supabase...');
    await loadMenuWithRecipes();
    // We'll add more Supabase loads here as needed
  };

  loadInitialData();
}, []); // Empty array = runs once on mount



// REPLACE the entire getAllDishNames function with:
const getAllDishNames = () => {
  if (allDishNames && allDishNames.length > 0) {
    return allDishNames;
  }

  const stored = localStorage.getItem('allDishNames');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing stored dish names:', e);
    }
  }

  return [];
};

  // Add state for waste tracking
  const [wasteLog, setWasteLog] = useState(() => loadFromStorage('wasteLog', []));

  const [newPrepEntry, setNewPrepEntry] = useState({
    dishName: '',
    quantityCooked: '',
    containerSize: '500ml',
    portionSize: 160,
    preparedBy: 'Vasanth'
  });

  // Add after your other useState declarations
  const [userRole, setUserRole] = useState(() =>
    localStorage.getItem('userRole') || null
  );
  const [showRoleSelector, setShowRoleSelector] = useState(() =>
    !localStorage.getItem('userRole')
  );


  // Role-based permissions
  const rolePermissions = {
    owner: {
      canSeeCosts: true,
      canSeeReports: true,
      canManageInventory: true,
      canAddStaff: true,
      tabs: ['dashboard', 'smart-planning', 'prep', 'dispatch', 'sales', 'old-stock', 'waste', 'recipe-bank', 'inventory', 'procurement', 'reports', 'users']

    },
    manager: {
      canSeeCosts: true,
      canSeeReports: false,
      canManageInventory: true,
      canAddStaff: true,
      tabs: ['dashboard', 'smart-planning', 'prep', 'dispatch', 'sales', 'old-stock', 'waste', 'recipe-bank', 'inventory', 'procurement']
    },
    chef: {
      canSeeCosts: false,
      canSeeReports: false,
      canManageInventory: false,
      canAddStaff: false,
      tabs: ['prep', 'dispatch', 'smart-planning']
    },
    staff: {
      canSeeCosts: false,
      canSeeReports: false,
      canManageInventory: false,
      canAddStaff: false,
      tabs: ['sales', 'old-stock']
    }
  };



  // Replace your hardcoded login system with this Supabase version:

  // 1. LOGIN STATE (keep your existing state variables)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);





  // Get current permissions
  const currentPermissions = rolePermissions[userRole] || rolePermissions.staff;

  // Add after your role state variables
  const [shopStatuses, setShopStatuses] = useState(() => {
    const saved = localStorage.getItem('shopStatuses');
    return saved ? JSON.parse(saved) : {"Eastham": "closed", "Bethnal Green": "closed"};
  });

  // Add these state variables
const [showDispatchModal, setShowDispatchModal] = useState(false);
const [quickDispatchItem, setQuickDispatchItem] = useState('');
const [quickDispatchQty, setQuickDispatchQty] = useState('');

  const [shopOpenTimes, setShopOpenTimes] = useState(() => {
    const saved = localStorage.getItem('shopOpenTimes');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedLocation, setSelectedLocation] = useState('all');


  // Add these after your existing state variables
  const [menuItems, setMenuItems] = useState([]);
  const [recipeBank, setRecipeBank] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);


  // Add these new state variables
  const [selectedSalesLocation, setSelectedSalesLocation] = useState('Eastham');
  const [salesViewMode, setSalesViewMode] = useState('stock-tracker');
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');


  // Add this to your KitchenERP.js file

  // 1. PORTION CONFIGURATION TABLE - Add this after your state variables
  const portionConfig = {
    // Biryani Dishes
    'Chicken Biryani': { portionsPerKg: 6, portionSize: 166, containerSize: '650ml' },
    'Lamb Biryani': { portionsPerKg: 6, portionSize: 166, containerSize: '650ml' },
    'Veg Biryani': { portionsPerKg: 6, portionSize: 166, containerSize: '650ml' },
    'Donne Biryani Chicken': { portionsPerKg: 6, portionSize: 166, containerSize: '650ml' },
    'Donne Biryani Lamb': { portionsPerKg: 6, portionSize: 166, containerSize: '650ml' },
    'Prawns Pulav': { portionsPerKg: 6, portionSize: 166, containerSize: '650ml' },

    // Curry Dishes
    'Chicken Curry': { portionsPerKg: 10, portionSize: 100, containerSize: '500ml' },
    'Lamb Curry': { portionsPerKg: 10, portionSize: 100, containerSize: '500ml' },
    'Fish Curry': { portionsPerKg: 10, portionSize: 100, containerSize: '500ml' },
    'Paneer Butter Masala': { portionsPerKg: 10, portionSize: 100, containerSize: '500ml' },
    'Dal Tadka': { portionsPerKg: 10, portionSize: 100, containerSize: '500ml' },

    // Starters
    'Chicken Pakora': { portionsPerKg: 12, portionSize: 83, containerSize: '12oz' },
    'Veg Samosa': { portionsPerKg: 15, portionSize: 66, containerSize: '8oz' },
    'Onion Bhaji': { portionsPerKg: 15, portionSize: 66, containerSize: '8oz' },

    // Sides & Chutneys
    'Salan': { portionsPerKg: 12, portionSize: 83, containerSize: '12oz' },
    'Raitha': { portionsPerKg: 12, portionSize: 83, containerSize: '8oz' },

    // Default
    'default': { portionsPerKg: 8, portionSize: 125, containerSize: '500ml' }
  };

  // 2. PREP SUGGESTION CALCULATOR - Add this function
  const calculatePrepSuggestion = (dishName) => {
    // Get portion config
    const config = portionConfig[dishName] || portionConfig['default'];

    // Get last 7 days sales for this dish
    const last7DaysSales = sales.filter(s => {
      const saleDate = new Date(s.date);
      const daysAgo = (new Date() - saleDate) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7 && s.dishName === dishName;
    });

    // Calculate average daily sales
    let avgDailySales = 20; // Default
    if (last7DaysSales.length > 0) {
      const totalSold = last7DaysSales.reduce((sum, s) =>
        sum + (s.receivedPortions - s.remainingPortions), 0
      );
      avgDailySales = Math.round(totalSold / 7);
    }

    // Day of week multiplier
    const dayMultiplier = {
      0: 1.3,  // Sunday - Busy
      1: 0.8,  // Monday - Quiet
      2: 0.9,  // Tuesday
      3: 0.9,  // Wednesday
      4: 1.0,  // Thursday
      5: 1.2,  // Friday - Busy
      6: 1.3   // Saturday - Busy
    };

    const today = new Date().getDay();
    const todayMultiplier = dayMultiplier[today] || 1;

    // Calculate current stock (all locations)
    const currentStock = sales
      .filter(s => s.dishName === dishName && !s.endOfDay)
      .reduce((sum, s) => sum + s.remainingPortions, 0);

    const oldStock = sales
      .filter(s => s.dishName === dishName && s.endOfDay && s.finalStock > 0)
      .reduce((sum, s) => sum + s.finalStock, 0);

    const totalStock = currentStock + oldStock;

    // Calculate suggestion
    const expectedDemand = Math.ceil(avgDailySales * todayMultiplier * 1.1); // 10% buffer
    const needToPrepare = Math.max(0, expectedDemand - totalStock);
    const kgToPrepare = Math.ceil((needToPrepare / config.portionsPerKg) * 10) / 10;

    return {
      dishName,
      avgDailySales,
      currentStock,
      oldStock,
      totalStock,
      expectedDemand,
      needToPrepare,
      kgToPrepare,
      totalPortions: Math.floor(kgToPrepare * config.portionsPerKg),
      config,
      priority: needToPrepare > expectedDemand * 0.5 ? 'high' :
               needToPrepare > 0 ? 'medium' : 'low'
    };
  };

  useEffect(() => {
    const loadInventoryFromDatabase = async () => {
      // Load from Supabase
    };
    loadInventoryFromDatabase();
  }, []);



  // Load menu items with recipes from Supabase
  const loadMenuWithRecipes = async () => {
    try {
      setMenuLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          recipe_bank (
            id,
            dish_name,
            ingredients,
            cost_per_kg
          )
        `)
        .eq('is_active', true)
        .order('dish_name');

      if (error) throw error;
      setMenuItems(data || []);
      console.log('Menu loaded:', data?.length, 'items');
    } catch (error) {
      console.error('Error loading menu:', error);
    } finally {
      setMenuLoading(false);
    }
  };

  const getRecipeDishes = () => {
    return getAllDishNames();
  };

  // Helper: Get menu by location
  const getMenuByLocation = (location) => {
    if (location === 'all') {
      return menuItems;
    }
    return menuItems.filter(item => item.location === location);
  };



  const [newSalesEntry, setNewSalesEntry] = useState({
    location: '',
    dishName: '',
    receivedPortions: '',
    remainingPortions: ''
  });



  const [newWasteEntry, setNewWasteEntry] = useState({
    dishName: '',
    location: '',
    portions: '',
    reason: '',
    notes: ''
  });

  // State for editing
  const [editingPrepItem, setEditingPrepItem] = useState(null);
  const [editingSalesItem, setEditingSalesItem] = useState(null);

  const [containerSizes] = useState([
    { size: '500ml', portionWeight: 160, category: 'Main Dishes' },
    { size: '650ml', portionWeight: 200, category: 'Main Dishes' },
    { size: '1000ml', portionWeight: 300, category: 'Large Portions' },
    { size: '8oz', portionWeight: 80, category: 'Chutneys/Raitha' },
    { size: '12oz', portionWeight: 120, category: 'Chutneys/Raitha' }
  ]);

  const [activeTab, setActiveTab] = useState('dashboard');


  // Helper function for location-based priorities using real menu data
  const getLocationBasedPriorities = (location) => {
    // Get menu items for the selected location
    const locationMenu = getMenuByLocation(location);

    const priorities = [];

    locationMenu.forEach(menuItem => {
      // Skip inventory-only items
      if (!menuItem.requires_recipe) return;

      const dish = menuItem.dish_name;

      // Check prep log for this dish
      const stock = prepLog.filter(p =>
        p.dishName === dish &&
        p.status === 'prepared'
      );

      const totalStock = stock.reduce((sum, item) => sum + item.totalPortions, 0);

      // Check sales data for demand
      const recentSales = sales.filter(s =>
        s.dishName === dish &&
        (location === 'all' || s.location === location)
      );

      const avgDailySales = recentSales.length > 0
        ? recentSales.reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0) / Math.max(1, recentSales.length)
        : 20; // Default estimate

      // Priority if stock is low
      if (totalStock < avgDailySales * 0.5) {
        priorities.push({
          dish,
          location: location === 'all' ? 'Both Locations' : location,
          currentStock: totalStock,
          needed: Math.ceil(avgDailySales * 1.5),
          avgSales: Math.round(avgDailySales),
          category: menuItem.category
        });
      }
    });

    return priorities.sort((a, b) => a.currentStock - b.currentStock);
  };

  // Helper functions
  const getInventoryMetrics = () => {
    return inventory.map(item => {
      const usedThisWeek = calculateUsedFromPrep(item.name);
      const closingBalance = item.openingStock + item.receivedThisWeek - usedThisWeek;
      const procurementRequired = closingBalance < item.reorderLevel ? Math.max(0, item.reorderLevel - closingBalance + item.reorderLevel * 0.5) : 0;
      const stockValue = closingBalance * item.unitCost;

      return {
        ...item,
        usedThisWeek,
        closingBalance,
        procurementRequired,
        stockValue
      };
    });
  };

  const calculateUsedFromPrep = (ingredientName) => {
    let totalUsed = 0;
    prepLog.forEach(prep => {
      const recipeItems = recipes.filter(r => r.dishName === prep.dishName && r.ingredient === ingredientName);
      recipeItems.forEach(recipe => {
        totalUsed += recipe.quantityPer1kg * prep.quantityCooked;
      });
    });
    return totalUsed;
  };

  // NEW CALLBACK HANDLERS FOR ENHANCED COMPONENTS
  const handleQuickPrep = (dishName, suggestedKg) => {
    setNewPrepEntry(prev => ({
      ...prev,
      dishName,
      quantityCooked: suggestedKg.toString(),
      portionSize: dishName.includes('Biryani') ? 166 :
                   dishName.includes('Curry') ? 100 : 160,
      containerSize: dishName.includes('Biryani') ? '650ml' : '500ml'
    }));
    setActiveTab('prep');
    alert(`✅ Prep form auto-filled for ${dishName} - ${suggestedKg}kg`);
  };

  const handleCreateOffer = (offer) => {
    console.log('Offer created:', offer);
    saveToDatabase('offers', {
      dish_name: offer.dishName,
      location: offer.location,
      discount_percentage: offer.discount,
      offer_price: offer.offerPrice,
      original_price: offer.originalPrice,
      portions_available: offer.portions,
      valid_until: offer.validUntil,
      status: offer.status
    });
    alert(`✅ Offer activated!\n${offer.headline}`);
  };

  const handleSendNotification = (template) => {
    console.log('Sending notification:', template);
    alert(`📤 ${template.channel} notification sent!`);
    saveToDatabase('notifications', {
      channel: template.channel,
      location: template.location,
      message: template.message,
      sent_at: new Date().toISOString()
    });
  };

  const handleQuickAction = (action, data) => {
    console.log('Quick action:', action, data);
    switch(action) {
      case 'prep':
      case 'Cook immediately':
        setActiveTab('prep');
        if (data.items && data.items[0]) {
          handleQuickPrep(data.items[0].dish, 5);
        }
        break;
      case 'offers':
      case 'Create special offers':
        setActiveTab('old-stock');
        break;
      case 'procurement':
        setActiveTab('procurement');
        break;
      case 'waste-analysis':
        setActiveTab('waste');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };


  const calculateDishCost = (dishName, quantity = 1) => {
    const dishRecipes = recipes.filter(r => r.dishName === dishName);
    let totalCost = 0;

    dishRecipes.forEach(recipe => {
      const inventoryItem = inventory.find(i => i.name === recipe.ingredient);
      if (inventoryItem) {
        totalCost += recipe.quantityPer1kg * quantity * inventoryItem.unitCost;
      }
    });

    return totalCost;
  };

  const generateForecast = () => {
    try {
      const allDishes = [
        ...sales.map(s => s.dishName),
        ...dispatch.map(d => d.dishName),
        ...prepLog.map(p => p.dishName)
      ];
      const dishes = [...new Set(allDishes)];

      if (dishes.length === 0) {
        const recipeDishes = getAllDishNames().slice(0, 3);
        return recipeDishes.map(dish => ({
          dish,
          expectedDemand: 20,
          coldRoomStock: 0,
          totalRemaining: 0,
          qtyToCook: 3.0,
          cost: calculateDishCost(dish, 3.0) || 0,
          priority: 'MEDIUM'
        }));
      }

      return dishes.map(dish => {
        const soldToday = sales
          .filter(s => s.dishName === dish)
          .reduce((sum, s) => sum + Math.max(0, (s.receivedPortions || 0) - (s.remainingPortions || 0)), 0);

        const coldStock = dispatch
          .filter(d => d.dishName === dish)
          .reduce((sum, d) => sum + (d.coldRoomStock || 0), 0);

        const remaining = sales
          .filter(s => s.dishName === dish)
          .reduce((sum, s) => sum + (s.remainingPortions || 0), 0);

        const expectedDemand = Math.max(soldToday || 15, 15);
        const cookQty = Math.max(0, (expectedDemand - coldStock - remaining) * 0.16);

        return {
          dish,
          expectedDemand,
          coldRoomStock: coldStock,
          totalRemaining: remaining,
          qtyToCook: Math.round(cookQty * 10) / 10,
          cost: calculateDishCost(dish, cookQty) || 0,
          priority: remaining > expectedDemand * 0.7 ? 'LOW' : 'MEDIUM'
        };
      });
    } catch (error) {
      console.error('Forecast generation error:', error);
      return [];
    }
  };

  // Check ingredient availability before allowing prep
  const checkIngredientAvailability = (dishName, quantity) => {
    const dishRecipes = recipes.filter(r => r.dishName === dishName);
    const insufficientIngredients = [];

    dishRecipes.forEach(recipe => {
      const inventoryItem = getInventoryMetrics().find(i => i.name === recipe.ingredient);
      if (inventoryItem) {
        const required = recipe.quantityPer1kg * quantity;
        if (inventoryItem.closingBalance < required) {
          insufficientIngredients.push({
            ingredient: recipe.ingredient,
            required,
            available: inventoryItem.closingBalance,
            shortage: required - inventoryItem.closingBalance
          });
        }
      }
    });

    return insufficientIngredients;
  };

  const handlePrepSubmit = async () => {
    if (newPrepEntry.dishName && newPrepEntry.quantityCooked && newPrepEntry.portionSize && newPrepEntry.preparedBy) {
      // Check ingredient availability (existing code)
      const shortages = checkIngredientAvailability(newPrepEntry.dishName, parseFloat(newPrepEntry.quantityCooked));

      if (shortages.length > 0) {
        const shortageMsg = shortages.map(s =>
          `${s.ingredient}: Need ${s.required.toFixed(2)} but only have ${s.available.toFixed(2)}`
        ).join('\n');

        if (!window.confirm(`⚠️ Insufficient ingredients:\n\n${shortageMsg}\n\nProceed anyway?`)) {
          return;
        }
      }

      const totalPortions = Math.floor((parseFloat(newPrepEntry.quantityCooked) * 1000) / newPrepEntry.portionSize);
      const now = new Date();

      const newEntry = {
        id: prepLog.length > 0 ? Math.max(...prepLog.map(p => p.id)) + 1 : 1,
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(), // ADD THIS - Full timestamp for age tracking
        prepTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), // ADD THIS
        dishName: newPrepEntry.dishName,
        quantityCooked: parseFloat(newPrepEntry.quantityCooked),
        preparedBy: newPrepEntry.preparedBy,
        portionSize: parseInt(newPrepEntry.portionSize),
        containerSize: newPrepEntry.containerSize,
        totalPortions,
        processed: false,
        ageInHours: 0, // ADD THIS - Will be calculated dynamically
        status: 'fresh' // ADD THIS - fresh/aging/old
      };



      // Success message with portion config info
      const config = portionConfig[newEntry.dishName] || portionConfig['default'];
      alert(`✅ Successfully added ${totalPortions} portions of ${newEntry.dishName}!\n\n📦 Using ${config.containerSize} containers\n⚖️ ${config.portionSize}g per portion\n👨‍🍳 Prepared by ${newEntry.preparedBy}`);
    } else {
      alert('Please fill in all required fields');
    }
  };






// 2. UPDATED LOGIN HANDLER WITH SUPABASE
const handleLogin = async (e) => {
  e.preventDefault();
  setLoginLoading(true);
  setLoginError('');

  try {
    // Query Supabase for user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', loginForm.username)
      .eq('password', loginForm.password)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      setLoginError('Invalid username or password');
      setLoginLoading(false);
      return;
    }

    // Login successful
    setIsLoggedIn(true);
    setCurrentUser(user);
    setUserRole(user.role);
    setShowRoleSelector(false);
    localStorage.setItem('userRole', user.role);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setLoginError('');
    setLoginLoading(false);

  } catch (error) {
    console.error('Login error:', error);
    setLoginError('Login failed. Please try again.');
    setLoginLoading(false);
  }
};

const handleLogout = () => {
  // Clear everything
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isLoggedIn');

  // Set states to show login screen
  setIsLoggedIn(false);  // THIS IS THE KEY!
  setCurrentUser(null);
  setUserRole(null);
  setShowRoleSelector(false);
  setActiveTab('dashboard');

  // Optional: Clear form data
  setLoginForm({ username: '', password: '' });
};





// ADD THE DELETE FUNCTION RIGHT AFTER IT:
const handleDeletePrepItem = async (prepId) => {
  const prepItem = prepLog.find(p => p.id === prepId);

  if (!prepItem) return;

  // Check if item is already dispatched
  if (prepItem.processed) {
    alert('❌ Cannot delete dispatched items!');
    return;
  }

  // Confirm deletion
  if (!window.confirm(`Delete ${prepItem.dishName} (${prepItem.totalPortions} portions)?`)) {
    return;
  }

  try {
    // Remove from local state
    setPrepLog(prev => prev.filter(p => p.id !== prepId));

    // If using database, also delete from there
    // await supabase.from('prep_log').delete().eq('id', prepId);

    alert('✅ Prep entry deleted successfully');
  } catch (error) {
    console.error('Error deleting prep item:', error);
    alert('❌ Error deleting item');
  }
};


  // Edit sales item function
  const handleEditSalesItem = (sale) => {
    setEditingSalesItem(sale.id);
    setNewSalesEntry({
      location: sale.location,
      dishName: sale.dishName,
      receivedPortions: sale.receivedPortions.toString(),
      remainingPortions: sale.remainingPortions.toString()
    });
  };

  const handleUpdateSalesItem = async () => {  // ← Add async
  if (newSalesEntry.location && newSalesEntry.dishName && newSalesEntry.receivedPortions !== '' && newSalesEntry.remainingPortions !== '') {

    // ⭐ UPDATE IN DATABASE
    const updatedSale = sales.find(s => s.id === editingSalesItem);
    if (updatedSale) {
      await saveToDatabase('sales', {
        id: updatedSale.id,  // Include ID for update
        dish_name: newSalesEntry.dishName,
        location: newSalesEntry.location,
        received_portions: parseInt(newSalesEntry.receivedPortions),
        remaining_portions: parseInt(newSalesEntry.remainingPortions),
        updated_by: `${newSalesEntry.location} Team`
      });
    }
    // ⭐ END DATABASE UPDATE

    setSales(prev => prev.map(sale =>
      sale.id === editingSalesItem
        ? {
            ...sale,
            location: newSalesEntry.location,
            dishName: newSalesEntry.dishName,
            receivedPortions: parseInt(newSalesEntry.receivedPortions),
            remainingPortions: parseInt(newSalesEntry.remainingPortions),
            time: new Date().toLocaleTimeString(),
            updatedBy: `${newSalesEntry.location} Team`
          }
        : sale
    ));

    setEditingSalesItem(null);
    setNewSalesEntry({
      location: '',
      dishName: '',
      receivedPortions: '',
      remainingPortions: ''
    });
    alert('Sales item updated successfully');
  } else {
    alert('Please fill in all fields');
  }
};

  // End of day closing function - FIXED
  const handleEndOfDay = (location) => {
    const locationSales = sales.filter(s => s.location === location && !s.endOfDay);

    if (locationSales.length === 0) {
      alert(`No active sales entries found for ${location}`);
      return;
    }

    const finalStock = locationSales.reduce((total, sale) => total + sale.remainingPortions, 0);

    if (window.confirm(`🏪 CLOSE ${location.toUpperCase()} FOR THE DAY?\n\n📊 Final Summary:\n• Total remaining stock: ${finalStock} portions\n• These will become OLD STOCK tomorrow\n• Location will be marked as CLOSED\n\n⚠️ This action cannot be undone!\n\nContinue?`)) {
      // Mark all sales items for this location as end-of-day
      setSales(prev => prev.map(sale =>
        sale.location === location && !sale.endOfDay
          ? {
              ...sale,
              endOfDay: true,
              finalStock: sale.remainingPortions,
              closedDate: new Date().toISOString().split('T')[0],
              closedTime: new Date().toLocaleTimeString(),
              closedBy: `${location} Manager`
            }
          : sale
      ));

      alert(`✅ ${location} CLOSED FOR THE DAY\n\n📊 Final Stock: ${finalStock} portions\n📅 These items are now OLD STOCK\n🎯 Tomorrow: Check "Old Stock Offers" for offers`);
    }
  };


  // Add waste tracking function
  const handleWasteSubmit = async () => {  // ← Add async
  if (newWasteEntry.dishName && newWasteEntry.location && newWasteEntry.portions && newWasteEntry.reason) {
    const newEntry = {
      id: wasteLog.length > 0 ? Math.max(...wasteLog.map(w => w.id)) + 1 : 1,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString(),
      ...newWasteEntry,
      portions: parseInt(newWasteEntry.portions),
      value: calculateDishCost(newWasteEntry.dishName) * 0.16 * parseInt(newWasteEntry.portions)
    };

    // ⭐ ADD DATABASE SAVE
    const dbEntry = {
      dish_name: newEntry.dishName,
      location: newEntry.location,
      portions: newEntry.portions,
      reason: newEntry.reason,
      notes: newEntry.notes || null,
      value: newEntry.value
    };

    await saveToDatabase('waste_log', dbEntry);
    // ⭐ END DATABASE SAVE

    setWasteLog(prev => [...prev, newEntry]);
    localStorage.setItem('wasteLog', JSON.stringify([...wasteLog, newEntry]));

    setNewWasteEntry({
      dishName: '',
      location: '',
      portions: '',
      reason: '',
      notes: ''
    });

    alert(`Waste recorded: ${newEntry.portions} portions of ${newEntry.dishName}`);
  } else {
    alert('Please fill in all required fields');
  }
};


// 6. QUICK USER MANAGEMENT COMPONENT (Add to owner's view)
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'staff',
    location: 'Eastham'
  });

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setUsers(data || []);
  };

  const handleAddUser = async () => {
    const { error } = await supabase
      .from('users')
      .insert([newUser]);

    if (!error) {
      alert('User added successfully!');
      setShowAddUser(false);
      setNewUser({ username: '', password: '', name: '', role: 'staff', location: 'Eastham' });
      loadUsers();
    } else {
      alert('Error adding user: ' + error.message);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (!error) {
      loadUsers();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <Users className="mr-2" /> User Management
      </h2>

      <button
        onClick={() => setShowAddUser(!showAddUser)}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Plus className="inline mr-1" size={16} />
        Add New User
      </button>

      {showAddUser && (
        <div className="bg-white border rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
              placeholder="Username"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <input
              placeholder="Full Name"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              className="px-3 py-2 border rounded"
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser({...newUser, role: e.target.value})}
              className="px-3 py-2 border rounded"
            >
              <option value="staff">Staff</option>
              <option value="chef">Chef</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
            <button
              onClick={handleAddUser}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Add User
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Username</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Location</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-4 py-2">{user.username}</td>
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'chef' ? 'bg-green-100 text-green-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-2">{user.location || '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                    className={`px-3 py-1 rounded text-xs ${
                      user.is_active
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {user.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};



  // ============================================
// ADD ALL THESE HANDLER FUNCTIONS (around line 1500)
// ============================================

// Handler to add new inventory item
const handleAddInventoryItem = async () => {
  if (newInventoryItem.name && newInventoryItem.openingStock && newInventoryItem.unitCost) {
    try {
      // Prepare data for database (snake_case)
      const dbItem = {
        name: newInventoryItem.name,
        unit: newInventoryItem.unit,
        opening_stock: parseFloat(newInventoryItem.openingStock),
        received_this_week: parseFloat(newInventoryItem.receivedThisWeek) || 0,
        reorder_level: parseFloat(newInventoryItem.reorderLevel) || 1,
        unit_cost: parseFloat(newInventoryItem.unitCost),
        supplier: newInventoryItem.supplier,
        category: newInventoryItem.category
      };

      // Insert into database and get the new record back
      const { data, error } = await supabase
        .from('inventory')
        .insert([dbItem])
        .select()
        .single();

      if (error) throw error;

      // Add to local state (convert to camelCase)
      const newItem = {
        id: data.id,
        name: data.name,
        unit: data.unit,
        openingStock: parseFloat(data.opening_stock),
        receivedThisWeek: parseFloat(data.received_this_week),
        reorderLevel: parseFloat(data.reorder_level),
        unitCost: parseFloat(data.unit_cost),
        supplier: data.supplier,
        category: data.category
      };

      setInventory(prev => [...prev, newItem]);

      // Reset form
      setNewInventoryItem({
        name: '',
        unit: 'kg',
        openingStock: '',
        receivedThisWeek: '',
        reorderLevel: '',
        unitCost: '',
        supplier: 'Local Supplier',
        category: 'Dry Items'
      });
      setShowAddInventoryItem(false);

      alert(`✅ Successfully added ${newItem.name} to inventory!`);
    } catch (error) {
      console.error('Error adding inventory item:', error);
      alert('❌ Error adding item to database');
    }
  } else {
    alert('❌ Please fill in all required fields');
  }
};

// Handler to start editing an inventory item
const handleEditInventoryItem = (item) => {
  setEditingInventoryItem(item.id);
  setNewInventoryItem({
    name: item.name,
    unit: item.unit,
    openingStock: item.openingStock.toString(),
    receivedThisWeek: item.receivedThisWeek.toString(),
    reorderLevel: item.reorderLevel.toString(),
    unitCost: item.unitCost.toString(),
    supplier: item.supplier,
    category: item.category
  });
};

// Handler to update an existing inventory item
const handleUpdateInventoryItem = async () => {
  if (newInventoryItem.name && newInventoryItem.openingStock && newInventoryItem.unitCost) {
    try {
      // Prepare data for database (snake_case)
      const dbItem = {
        name: newInventoryItem.name,
        unit: newInventoryItem.unit,
        opening_stock: parseFloat(newInventoryItem.openingStock),
        received_this_week: parseFloat(newInventoryItem.receivedThisWeek) || 0,
        reorder_level: parseFloat(newInventoryItem.reorderLevel) || 1,
        unit_cost: parseFloat(newInventoryItem.unitCost),
        supplier: newInventoryItem.supplier,
        category: newInventoryItem.category,
        updated_at: new Date().toISOString()
      };

      // Update in database
      const { error } = await supabase
        .from('inventory')
        .update(dbItem)
        .eq('id', editingInventoryItem);

      if (error) throw error;

      // Update local state (camelCase)
      setInventory(prev => prev.map(item =>
        item.id === editingInventoryItem
          ? {
              ...item,
              name: newInventoryItem.name,
              unit: newInventoryItem.unit,
              openingStock: parseFloat(newInventoryItem.openingStock),
              receivedThisWeek: parseFloat(newInventoryItem.receivedThisWeek) || 0,
              reorderLevel: parseFloat(newInventoryItem.reorderLevel) || 1,
              unitCost: parseFloat(newInventoryItem.unitCost),
              supplier: newInventoryItem.supplier,
              category: newInventoryItem.category
            }
          : item
      ));

      // Reset form
      setEditingInventoryItem(null);
      setNewInventoryItem({
        name: '',
        unit: 'kg',
        openingStock: '',
        receivedThisWeek: '',
        reorderLevel: '',
        unitCost: '',
        supplier: 'Local Supplier',
        category: 'Dry Items'
      });

      alert('✅ Inventory item updated successfully!');
    } catch (error) {
      console.error('Error updating inventory item:', error);
      alert('❌ Error updating item in database');
    }
  } else {
    alert('❌ Please fill in all required fields');
  }
};

// Handler to delete an inventory item
const handleDeleteInventoryItem = async (itemId, itemName) => {
  // Check if item is used in any recipes
  const isUsedInRecipes = recipes.some(r => r.ingredient === itemName);

  if (isUsedInRecipes) {
    alert(`❌ Cannot delete "${itemName}" - it's used in recipes!`);
    return;
  }

  if (window.confirm(`Are you sure you want to delete "${itemName}" from inventory?`)) {
    try {
      // Delete from database
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      // Delete from local state
      setInventory(prev => prev.filter(item => item.id !== itemId));
      alert(`✅ "${itemName}" deleted from inventory`);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      alert('❌ Error deleting item from database');
    }
  }
};



  // Add Waste Tracking Component
  const WasteTracking = () => {
    const totalWaste = wasteLog.reduce((sum, w) => sum + w.portions, 0);
    const totalWasteValue = wasteLog.reduce((sum, w) => sum + (w.value || 0), 0);
    const totalSoldPortions = sales.reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0);

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Trash2 className="mr-2" /> Waste Tracking
        </h2>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Waste This Week</p>
            <p className="text-2xl font-bold text-red-600">{totalWaste} portions</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Waste Value</p>
            <p className="text-2xl font-bold text-orange-600">£{totalWasteValue.toFixed(2)}</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Most Wasted</p>
            <p className="text-xl font-bold text-yellow-600">
              {wasteLog.length > 0 ?
                [...new Set(wasteLog.map(w => w.dishName))]
                  .map(dish => ({
                    dish,
                    count: wasteLog.filter(w => w.dishName === dish).reduce((sum, w) => sum + w.portions, 0)
                  }))
                  .sort((a, b) => b.count - a.count)[0]?.dish || 'N/A'
                : 'N/A'}
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Waste Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {totalSoldPortions > 0 ? ((totalWaste / (totalSoldPortions + totalWaste)) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* Add Waste Entry */}
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Record Waste</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dish Name *</label>
              <select
    value={newWasteEntry.dishName}
    onChange={(e) => setNewWasteEntry(prev => ({ ...prev, dishName: e.target.value }))}
    className="w-full p-2 border rounded"
  >
    <option value="">Select Dish</option>
    {getAllDishNames().map(dish => (
      <option key={dish} value={dish}>{dish}</option>
    ))}
  </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location *</label>
              <select
                value={newWasteEntry.location}
                onChange={(e) => setNewWasteEntry(prev => ({ ...prev, location: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Location</option>
                <option value="Central Kitchen">Central Kitchen</option>
                <option value="Eastham">Eastham</option>
                <option value="Bethnal Green">Bethnal Green</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Portions *</label>
              <input
                type="number"
                value={newWasteEntry.portions}
                onChange={(e) => setNewWasteEntry(prev => ({ ...prev, portions: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reason *</label>
              <select
                value={newWasteEntry.reason}
                onChange={(e) => setNewWasteEntry(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full p-2 border rounded"
              >
                <option value="">Select Reason</option>
                <option value="Expired">Expired</option>
                <option value="Spoiled">Spoiled</option>
                <option value="Overproduction">Overproduction</option>
                <option value="Quality Issue">Quality Issue</option>
                <option value="Customer Return">Customer Return</option>
                <option value="Preparation Error">Preparation Error</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <input
                type="text"
                value={newWasteEntry.notes}
                onChange={(e) => setNewWasteEntry(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2 border rounded"
                placeholder="Optional"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleWasteSubmit}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                <Plus size={16} className="inline mr-1" />
                Record Waste
              </button>
            </div>
          </div>
        </div>

        {/* Waste Log */}
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">Waste Log</h3>
          </div>
          <div className="overflow-x-auto">
            {wasteLog.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Time</th>
                    <th className="px-4 py-2 text-left">Dish</th>
                    <th className="px-4 py-2 text-left">Location</th>
                    <th className="px-4 py-2 text-left">Portions</th>
                    <th className="px-4 py-2 text-left">Reason</th>
                    <th className="px-4 py-2 text-left">Value</th>
                    <th className="px-4 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {wasteLog.map(waste => (
                    <tr key={waste.id}>
                      <td className="px-4 py-2">{waste.date}</td>
                      <td className="px-4 py-2">{waste.time}</td>
                      <td className="px-4 py-2 font-medium">{waste.dishName}</td>
                      <td className="px-4 py-2">{waste.location}</td>
                      <td className="px-4 py-2 text-red-600 font-medium">{waste.portions}p</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          {waste.reason}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-orange-600 font-medium">£{(waste.value || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{waste.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No Waste Recorded</h3>
                <p className="text-gray-500">Great job on minimizing waste!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Navigation tabs
  // Update tab order - Smart Planning as #2
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'smart-planning', label: 'Smart Planning', icon: Calendar }, // Moved to #2
    { id: 'prep', label: 'Prep Log', icon: ChefHat },
    { id: 'dispatch', label: 'Dispatch', icon: Truck },
    { id: 'sales', label: 'Sales Tracker', icon: DollarSign },
    { id: 'old-stock', label: 'Old Stock Offers', icon: AlertTriangle },
    { id: 'waste', label: 'Waste Tracking', icon: Trash2 },
    { id: 'recipe-bank', label: 'Recipe Bank', icon: ChefHat },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'procurement', label: 'Procurement', icon: ShoppingCart },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'users', label: 'Users', icon: Users }
  ];

  // Filter tabs based on current role
  const tabs = allTabs.filter(tab => currentPermissions.tabs.includes(tab.id));

  // Add Reports Component
  const Reports = () => {
    const [reportType, setReportType] = useState('daily');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const generateDailyReport = () => {
      const dailySales = sales.filter(s => s.date === selectedDate);
      const dailyPrep = prepLog.filter(p => p.date === selectedDate);
      const dailyDispatch = dispatch.filter(d => d.date === selectedDate);
      const dailyWaste = wasteLog.filter(w => w.date === selectedDate);

      const totalRevenue = dailySales.reduce((sum, s) => sum + ((s.receivedPortions - s.remainingPortions) * 8), 0);
      const totalCost = dailyPrep.reduce((sum, p) => sum + calculateDishCost(p.dishName, p.quantityCooked), 0);
      const totalWasteValue = dailyWaste.reduce((sum, w) => sum + (w.value || 0), 0);

      return {
        date: selectedDate,
        revenue: totalRevenue,
        cost: totalCost,
        profit: totalRevenue - totalCost,
        margin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1) : 0,
        portionsSold: dailySales.reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0),
        portionsWasted: dailyWaste.reduce((sum, w) => sum + w.portions, 0),
        wasteValue: totalWasteValue,
        byLocation: ['Eastham', 'Bethnal Green'].map(location => ({
          location,
          revenue: dailySales.filter(s => s.location === location).reduce((sum, s) => sum + ((s.receivedPortions - s.remainingPortions) * 8), 0),
          portions: dailySales.filter(s => s.location === location).reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0)
        }))
      };
    };

    const report = generateDailyReport();

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <FileText className="mr-2" /> Reports & Analytics
        </h2>

        {/* Report Controls */}
        <div className="bg-white border rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium mb-1">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="p-2 border rounded"
              >
                <option value="daily">Daily Report</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="p-2 border rounded"
              />
            </div>
            <div className="flex items-end">
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center">
                <Printer size={16} className="mr-2" />
                Print Report
              </button>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-6 text-center">Daily Report - {selectedDate}</h3>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-green-50 rounded">
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-600">£{report.revenue.toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded">
              <p className="text-sm text-gray-600">Cost</p>
              <p className="text-2xl font-bold text-blue-600">£{report.cost.toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded">
              <p className="text-sm text-gray-600">Profit</p>
              <p className="text-2xl font-bold text-purple-600">£{report.profit.toFixed(2)}</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded">
              <p className="text-sm text-gray-600">Margin</p>
              <p className="text-2xl font-bold text-yellow-600">{report.margin}%</p>
            </div>
          </div>

          {/* Operations Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h4 className="font-semibold mb-3">Sales Performance</h4>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Location</th>
                    <th className="text-right py-2">Portions</th>
                    <th className="text-right py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byLocation.map(loc => (
                    <tr key={loc.location} className="border-b">
                      <td className="py-2">{loc.location}</td>
                      <td className="text-right py-2">{loc.portions}</td>
                      <td className="text-right py-2">£{loc.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-2">Total</td>
                    <td className="text-right py-2">{report.portionsSold}</td>
                    <td className="text-right py-2">£{report.revenue.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Waste Analysis</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Portions Wasted:</span>
                  <span className="font-medium text-red-600">{report.portionsWasted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waste Value:</span>
                  <span className="font-medium text-red-600">£{report.wasteValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waste Rate:</span>
                  <span className="font-medium text-orange-600">
                    {report.portionsSold > 0 ?
                      ((report.portionsWasted / (report.portionsSold + report.portionsWasted)) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Items */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Key Insights & Actions</h4>
            <ul className="space-y-2 text-sm">
              {report.margin < 50 && (
                <li className="text-red-600">• Low profit margin - Review pricing or reduce costs</li>
              )}
              {report.portionsWasted > report.portionsSold * 0.1 && (
                <li className="text-orange-600">• High waste rate - Improve production planning</li>
              )}
              {report.margin > 60 && (
                <li className="text-green-600">• Excellent profit margin - Maintain current operations</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  };

  // 5. ENHANCED LOGIN SCREEN
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <ChefHat className="mx-auto text-blue-600 mb-4" size={48} />
            <h1 className="text-2xl font-bold text-gray-900">Rice Affair & Dozt</h1>
            <p className="text-gray-600 mt-2">Please login to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
                disabled={loginLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
                required
                disabled={loginLoading}
              />
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:bg-gray-400"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Login Credentials:</p>
            <div className="text-xs text-gray-600 space-y-1">


              <div>👨‍🍳 Bethnal Staff: bethnal / staff123</div>
              <div>👥 Eastham Staff: eastham / staff123</div>

            </div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-gray-100">
    <nav className="bg-white shadow-sm border-b">
  <div className="px-6 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <ChefHat className="text-blue-600" size={32} />
        <h1 className="text-xl font-bold text-gray-900">RICE AFFAIR & DOZT KITCHEN MANAGEMENT</h1>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            shopStatuses['Eastham'] === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            Eastham: {shopStatuses['Eastham'] === 'open' ? '🟢' : '🔴'}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            shopStatuses['Bethnal Green'] === 'open' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            BG: {shopStatuses['Bethnal Green'] === 'open' ? '🟢' : '🔴'}
          </span>
        </div>

      </div>
      <div className="flex items-center space-x-4">
        <div className="text-sm text-gray-600">
          Central Prep Kitchen | Eastham & Bethnal Green Locations
        </div>
        {userRole && (
    <div className="flex items-center space-x-2">
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
        userRole === 'owner' ? 'bg-purple-100 text-purple-800' :
        userRole === 'manager' ? 'bg-blue-100 text-blue-800' :
        userRole === 'chef' ? 'bg-green-100 text-green-800' :
        'bg-orange-100 text-orange-800'
      }`}>
        {userRole === 'owner' ? '👑 Owner' :
         userRole === 'manager' ? '💼 Manager' :
         userRole === 'chef' ? '👨‍🍳 Chef' :
         '👥 Staff'}
      </span>
      <button
        onClick={() => {
          localStorage.removeItem('userRole');
          setUserRole(null);
          setShowRoleSelector(true);
          setActiveTab(tabs[0]?.id || 'dashboard');
        }}
        className="text-xs text-blue-600 hover:text-blue-800"
      >
        Switch Role
      </button>
      <button
  onClick={handleLogout}
  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
>
  Logout
</button>
    </div>
  )}

      </div>
    </div>
  </div>
</nav>


{/* Role Selector Modal */}
{showRoleSelector && (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-8 max-w-md w-full">
      <h2 className="text-2xl font-bold mb-6 text-center">Welcome! Select Your Role</h2>
      <div className="space-y-3">
        <button
          onClick={() => {
            setUserRole('owner');
            localStorage.setItem('userRole', 'owner');
            setShowRoleSelector(false);
          }}
          className="w-full p-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <div className="font-bold text-lg">👑 Owner</div>
          <div className="text-sm mt-1">Full access to all features</div>
        </button>

        <button
          onClick={() => {
            setUserRole('manager');
            localStorage.setItem('userRole', 'manager');
            setShowRoleSelector(false);
          }}
          className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <div className="font-bold text-lg">💼 Manager</div>
          <div className="text-sm mt-1">Manage operations, no financial reports</div>
        </button>

        <button
          onClick={() => {
            setUserRole('chef');
            localStorage.setItem('userRole', 'chef');
            setShowRoleSelector(false);
          }}
          className="w-full p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <div className="font-bold text-lg">👨‍🍳 Chef</div>
          <div className="text-sm mt-1">Prep log and dispatch only</div>
        </button>

        <button
          onClick={() => {
            setUserRole('staff');
            localStorage.setItem('userRole', 'staff');
            setShowRoleSelector(false);
          }}
          className="w-full p-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          <div className="font-bold text-lg">👥 Kitchen Staff</div>
          <div className="text-sm mt-1">Sales tracker and orders</div>
        </button>
      </div>
    </div>
  </div>
)}




      <div className="flex">
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-6 py-3 text-left hover:bg-gray-50 ${
                    activeTab === tab.id ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-600' : 'text-gray-600'
                  }`}
                >
                  <Icon size={20} className="mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">
        {activeTab === 'dashboard' && (
<EnhancedMainDashboard
  sales={sales}
  dispatch={dispatch}
  prepLog={prepLog}
  inventory={inventory}
  wasteLog={wasteLog}
  recipes={recipes}
  calculateDishCost={calculateDishCost}
  shopStatuses={shopStatuses}
  currentUser={currentUser}
  userRole={userRole}
  onQuickAction={handleQuickAction}
/>
)}

          {/* 3. ENHANCED PREP LOG COMPONENT - Replace your existing prep tab content */}


          {activeTab === 'prep' && (
        <EnhancedPrepLog
          prepLog={prepLog}
          setPrepLog={setPrepLog}
          recipes={recipes}
          inventory={inventory}
          sales={sales}
          calculateDishCost={calculateDishCost}
          checkIngredientAvailability={checkIngredientAvailability}
          getAllDishNames={getAllDishNames}  // ADD THIS LINE
        />
      )}

      {activeTab === 'dispatch' && (
        <EnhancedDispatch
          dispatch={dispatch}
          setDispatch={setDispatch}
          prepLog={prepLog}
          setPrepLog={setPrepLog}
          sales={sales}
          setSales={setSales}
          calculateDishCost={calculateDishCost}
          getAllDishNames={getAllDishNames}
          saveToDatabase={saveToDatabase}
        />
      )}


  {activeTab === 'sales' && (
    <EnhancedSales
      sales={sales}
      setSales={setSales}
      dispatch={dispatch}
      setDispatch={setDispatch}
      saveToDatabase={saveToDatabase}
      getAllDishNames={getAllDishNames}
    />
  )}



  {activeTab === 'old-stock' && (
<OldStockOffersManager
sales={sales}
dispatch={dispatch}
prepLog={prepLog}
calculateDishCost={calculateDishCost}
onCreateOffer={handleCreateOffer}
onSendNotification={handleSendNotification}
/>
)}

          {activeTab === 'waste' && <WasteTracking />}

          {activeTab === 'reports' && <Reports />}

          {activeTab === 'recipe-bank' && (
      <EnhancedRecipeBank
        recipes={recipes}
        setRecipes={setRecipes}
        inventory={inventory}
        setInventory={setInventory}
        userRole={userRole}
        calculateDishCost={calculateDishCost}
      />
    )}

    {activeTab === 'inventory' && (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Package className="mr-2" /> Inventory Tracker
        </h2>

        {/* Add Item Button */}
        <div className="mb-4">
          <button
            onClick={() => {
              setShowAddInventoryItem(!showAddInventoryItem);
              setEditingInventoryItem(null);
              setNewInventoryItem({
                name: '',
                unit: 'kg',
                openingStock: '',
                receivedThisWeek: '',
                reorderLevel: '',
                unitCost: '',
                supplier: 'Local Supplier',
                category: 'Dry Items'
              });
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <Plus className="mr-2" size={20} />
            Add New Item
          </button>
        </div>

        {/* Add/Edit Item Form */}
        {(showAddInventoryItem || editingInventoryItem) && (
          <div className="bg-white border-2 border-green-500 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4 text-green-700">
              {editingInventoryItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Name *</label>
                <input
                  type="text"
                  value={newInventoryItem.name}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="e.g. Chicken Thigh"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={newInventoryItem.category}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="Meat">Meat</option>
                  <option value="Seafood">Seafood</option>
                  <option value="Vegetables">Vegetables</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Dry Items">Dry Items</option>
                  <option value="Spices">Spices</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unit *</label>
                <select
                  value={newInventoryItem.unit}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="pieces">pieces</option>
                  <option value="bunch">bunch</option>
                  <option value="box">box</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier</label>
                <select
                  value={newInventoryItem.supplier}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="Pacific Seafood">Pacific Seafood</option>
                  <option value="Booker">Booker</option>
                  <option value="Local Butcher">Local Butcher</option>
                  <option value="Fish Market">Fish Market</option>
                  <option value="Indian Grocers">Indian Grocers</option>
                  <option value="Local Supplier">Local Supplier</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Opening Stock *</label>
                <input
                  type="number"
                  step="0.1"
                  value={newInventoryItem.openingStock}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, openingStock: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Received This Week</label>
                <input
                  type="number"
                  step="0.1"
                  value={newInventoryItem.receivedThisWeek}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, receivedThisWeek: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reorder Level</label>
                <input
                  type="number"
                  step="0.1"
                  value={newInventoryItem.reorderLevel}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, reorderLevel: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unit Cost (£) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInventoryItem.unitCost}
                  onChange={(e) => setNewInventoryItem(prev => ({ ...prev, unitCost: e.target.value }))}
                  className="w-full p-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              {editingInventoryItem ? (
                <button
                  onClick={handleUpdateInventoryItem}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <Save className="mr-2" size={16} />
                  Update Item
                </button>
              ) : (
                <button
                  onClick={handleAddInventoryItem}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                >
                  <Plus className="mr-2" size={16} />
                  Add Item
                </button>
              )}

              <button
                onClick={() => {
                  setShowAddInventoryItem(false);
                  setEditingInventoryItem(null);
                  setNewInventoryItem({
                    name: '',
                    unit: 'kg',
                    openingStock: '',
                    receivedThisWeek: '',
                    reorderLevel: '',
                    unitCost: '',
                    supplier: 'Local Supplier',
                    category: 'Dry Items'
                  });
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-left">Unit</th>
                <th className="px-4 py-2 text-left">Opening</th>
                <th className="px-4 py-2 text-left">Received</th>
                <th className="px-4 py-2 text-left">Used</th>
                <th className="px-4 py-2 text-left">Closing</th>
                <th className="px-4 py-2 text-left">Reorder</th>
                <th className="px-4 py-2 text-left">Cost/Unit</th>
                <th className="px-4 py-2 text-left">Value</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {getInventoryMetrics().map(item => (
                <tr key={item.id} className={item.closingBalance <= item.reorderLevel ? 'bg-red-50' : ''}>
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.category === 'Meat' ? 'bg-red-100 text-red-800' :
                      item.category === 'Vegetables' ? 'bg-green-100 text-green-800' :
                      item.category === 'Spices' ? 'bg-orange-100 text-orange-800' :
                      item.category === 'Seafood' ? 'bg-cyan-100 text-cyan-800' :
                      item.category === 'Dairy' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-2">{item.unit}</td>
                  <td className="px-4 py-2">{item.openingStock}</td>
                  <td className="px-4 py-2">{item.receivedThisWeek}</td>
                  <td className="px-4 py-2">{item.usedThisWeek.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span className={item.closingBalance <= item.reorderLevel ? 'text-red-600 font-bold' : ''}>
                      {item.closingBalance.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-2">{item.reorderLevel}</td>
                  <td className="px-4 py-2">£{item.unitCost.toFixed(2)}</td>
                  <td className="px-4 py-2">£{item.stockValue.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditInventoryItem(item)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Item"
                      >
                        <Edit size={16} />
                      </button>
                      {userRole === 'owner' && (
                        <button
                          onClick={() => handleDeleteInventoryItem(item.id, item.name)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete Item"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Items</div>
            <div className="text-2xl font-bold text-blue-600">{inventory.length}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Total Stock Value</div>
            <div className="text-2xl font-bold text-green-600">
              £{getInventoryMetrics().reduce((sum, item) => sum + item.stockValue, 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Low Stock Items</div>
            <div className="text-2xl font-bold text-red-600">
              {getInventoryMetrics().filter(item => item.closingBalance <= item.reorderLevel).length}
            </div>
          </div>
        </div>
      </div>
    )}

    {activeTab === 'smart-planning' && (
      <SmartPlanningDashboard
        sales={sales}
        dispatch={dispatch}
        prepLog={prepLog}
        inventory={inventory}
        recipes={recipes}
        getAllDishNames={getAllDishNames}
        calculateDishCost={calculateDishCost}
        onQuickPrep={handleQuickPrep}
      />
    )}


          {activeTab === 'users' && currentPermissions.tabs.includes('users') && <UserManagement />}

          {activeTab === 'procurement' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <ShoppingCart className="mr-2" /> Smart Procurement Plan
              </h2>
              <div className="bg-white border rounded-lg">
                <div className="p-4 border-b">
                  <h3 className="text-lg font-semibold">Items to Order</h3>
                  <p className="text-sm text-gray-600 mt-1">Automatically calculated based on usage and reorder levels</p>
                </div>
                <div className="divide-y">
                  {getInventoryMetrics()
                    .filter(item => item.procurementRequired > 0)
                    .map(item => (
                      <div key={item.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div>
                          <p className="font-medium text-lg">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Current:</span> {item.closingBalance.toFixed(1)} {item.unit} |
                            <span className="font-medium"> Reorder Level:</span> {item.reorderLevel} {item.unit} |
                            <span className="font-medium"> Supplier:</span> {item.supplier}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600 text-xl">
                            Order: {item.procurementRequired.toFixed(1)} {item.unit}
                          </p>
                          <p className="text-sm text-gray-600">
                            Cost: <span className="font-medium">£{(item.procurementRequired * item.unitCost).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  }
                  {getInventoryMetrics().filter(item => item.procurementRequired > 0).length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
                      <p className="text-lg font-medium">All items are well stocked!</p>
                      <p className="text-sm">No procurement required at this time.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default KitchenERP;
