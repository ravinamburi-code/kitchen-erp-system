import { supabase } from './supabaseClient';
import React, { useState, useEffect } from 'react';
import {
  ChefHat, Package, Truck, BarChart3, Calendar,
  ShoppingCart, AlertTriangle, DollarSign, Users,
  Plus, Edit, Trash2, Save, X, CheckCircle, FileText,
  TrendingUp, TrendingDown, Clock, Printer
} from 'lucide-react';

// ADD THESE TWO LINES:
import EnhancedRecipeBank from './EnhancedRecipeBank';
import EnhancedPrepLog from './EnhancedPrepLog';

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


  // Complete inventory with all items including new ingredients from recipes
  const [inventory, setInventory] = useState(() => loadFromStorage('inventory', [
    // Pacific Seafood Items
    { id: 1, name: 'Baby Aubergine', unit: 'box', openingStock: 3, receivedThisWeek: 1, reorderLevel: 1, unitCost: 16.99, supplier: 'Pacific Seafood', category: 'Vegetables' },
    { id: 2, name: 'Coriander Fresh', unit: 'bunch', openingStock: 50, receivedThisWeek: 20, reorderLevel: 10, unitCost: 0.99, supplier: 'Pacific Seafood', category: 'Vegetables' },
    { id: 3, name: 'Ginger Fresh', unit: 'kg', openingStock: 25, receivedThisWeek: 10, reorderLevel: 3, unitCost: 3.85, supplier: 'Pacific Seafood', category: 'Vegetables' },
    { id: 4, name: 'Mint Fresh', unit: 'bunch', openingStock: 40, receivedThisWeek: 20, reorderLevel: 8, unitCost: 0.89, supplier: 'Pacific Seafood', category: 'Vegetables' },
    { id: 5, name: 'Garlic Whole Fresh', unit: 'kg', openingStock: 15, receivedThisWeek: 8, reorderLevel: 3, unitCost: 5.99, supplier: 'Pacific Seafood', category: 'Vegetables' },
    { id: 6, name: 'Cashew Broken Heera', unit: 'kg', openingStock: 8, receivedThisWeek: 12, reorderLevel: 2, unitCost: 5.99, supplier: 'Pacific Seafood', category: 'Dry Items' },
    { id: 7, name: 'Garam Masala Natco', unit: 'kg', openingStock: 5, receivedThisWeek: 3, reorderLevel: 1, unitCost: 8.99, supplier: 'Pacific Seafood', category: 'Spices' },
    { id: 8, name: 'Ghee Butter Heera', unit: 'kg', openingStock: 10, receivedThisWeek: 8, reorderLevel: 2, unitCost: 10.50, supplier: 'Pacific Seafood', category: 'Dry Items' },
    { id: 9, name: 'Basmati Rice Green Daawat', unit: 'kg', openingStock: 60, receivedThisWeek: 80, reorderLevel: 20, unitCost: 1.75, supplier: 'Pacific Seafood', category: 'Dry Items' },
    { id: 10, name: 'Turmeric Powder Natco', unit: 'kg', openingStock: 3, receivedThisWeek: 1, reorderLevel: 0.5, unitCost: 5.99, supplier: 'Pacific Seafood', category: 'Spices' },

    // Booker Items
    { id: 11, name: 'Natural Yogurt', unit: 'kg', openingStock: 15, receivedThisWeek: 20, reorderLevel: 5, unitCost: 1.10, supplier: 'Booker', category: 'Dairy' },
    { id: 12, name: 'Vegetable Oil Rapeseed', unit: 'litre', openingStock: 35, receivedThisWeek: 40, reorderLevel: 10, unitCost: 3.25, supplier: 'Booker', category: 'Dry Items' },
    { id: 13, name: 'Salt', unit: 'kg', openingStock: 10, receivedThisWeek: 12, reorderLevel: 3, unitCost: 1.25, supplier: 'Booker', category: 'Dry Items' },
    { id: 14, name: 'Cooking Onion', unit: 'kg', openingStock: 20, receivedThisWeek: 10, reorderLevel: 5, unitCost: 0.80, supplier: 'Booker', category: 'Vegetables' },
    { id: 15, name: 'Salad Tomatoes', unit: 'kg', openingStock: 10, receivedThisWeek: 6, reorderLevel: 3, unitCost: 1.33, supplier: 'Booker', category: 'Vegetables' },

    // Meat Items
    { id: 16, name: 'Chicken Thigh', unit: 'kg', openingStock: 25, receivedThisWeek: 20, reorderLevel: 8, unitCost: 5.80, supplier: 'Local Butcher', category: 'Meat' },
    { id: 17, name: 'Boneless Chicken', unit: 'kg', openingStock: 30, receivedThisWeek: 25, reorderLevel: 10, unitCost: 7.50, supplier: 'Local Butcher', category: 'Meat' },
    { id: 18, name: 'Lamb Boneless', unit: 'kg', openingStock: 8, receivedThisWeek: 5, reorderLevel: 2, unitCost: 11.00, supplier: 'Local Butcher', category: 'Meat' },
    { id: 19, name: 'Lamb Meat', unit: 'kg', openingStock: 15, receivedThisWeek: 10, reorderLevel: 5, unitCost: 14.50, supplier: 'Local Butcher', category: 'Meat' },
    { id: 20, name: 'Raw Prawns', unit: 'kg', openingStock: 8, receivedThisWeek: 5, reorderLevel: 2, unitCost: 16.50, supplier: 'Fish Market', category: 'Seafood' },

    // Additional items from new recipes
    { id: 21, name: 'Peanuts', unit: 'kg', openingStock: 15, receivedThisWeek: 5, reorderLevel: 3, unitCost: 4.50, supplier: 'Indian Grocers', category: 'Dry Items' },
    { id: 22, name: 'Coconut Dry', unit: 'kg', openingStock: 8, receivedThisWeek: 3, reorderLevel: 2, unitCost: 6.80, supplier: 'Indian Grocers', category: 'Dry Items' },
    { id: 23, name: 'Fried Onions', unit: 'kg', openingStock: 5, receivedThisWeek: 2, reorderLevel: 1, unitCost: 12.50, supplier: 'Indian Grocers', category: 'Dry Items' },
    { id: 24, name: 'Sesame Seeds', unit: 'kg', openingStock: 3, receivedThisWeek: 1, reorderLevel: 0.5, unitCost: 8.20, supplier: 'Indian Grocers', category: 'Spices' },
    { id: 25, name: 'Chilli Powder', unit: 'kg', openingStock: 4, receivedThisWeek: 2, reorderLevel: 1, unitCost: 9.50, supplier: 'Indian Grocers', category: 'Spices' },
    { id: 26, name: 'Coriander Powder', unit: 'kg', openingStock: 3, receivedThisWeek: 2, reorderLevel: 1, unitCost: 7.25, supplier: 'Indian Grocers', category: 'Spices' },
    { id: 27, name: 'Tomato Puree', unit: 'kg', openingStock: 12, receivedThisWeek: 8, reorderLevel: 3, unitCost: 3.80, supplier: 'Booker', category: 'Vegetables' },
    { id: 28, name: 'Black Pepper', unit: 'kg', openingStock: 2, receivedThisWeek: 1, reorderLevel: 0.5, unitCost: 35.00, supplier: 'Indian Grocers', category: 'Spices' },
    { id: 29, name: 'Green Cardamom', unit: 'kg', openingStock: 0.8, receivedThisWeek: 0.3, reorderLevel: 0.2, unitCost: 85.00, supplier: 'Indian Grocers', category: 'Spices' },
    { id: 30, name: 'Green Chillies', unit: 'kg', openingStock: 5, receivedThisWeek: 3, reorderLevel: 1, unitCost: 4.50, supplier: 'Indian Grocers', category: 'Vegetables' },
    { id: 31, name: 'Chitti Muthayalu Rice', unit: 'kg', openingStock: 25, receivedThisWeek: 15, reorderLevel: 8, unitCost: 3.20, supplier: 'Indian Grocers', category: 'Dry Items' },
    { id: 32, name: 'Ginger-Garlic Paste', unit: 'kg', openingStock: 8, receivedThisWeek: 4, reorderLevel: 2, unitCost: 5.50, supplier: 'Indian Grocers', category: 'Spices' },
    { id: 33, name: 'Cashew Nuts', unit: 'kg', openingStock: 3, receivedThisWeek: 2, reorderLevel: 1, unitCost: 18.50, supplier: 'Indian Grocers', category: 'Dry Items' },
    { id: 34, name: 'Kasoori Methi', unit: 'kg', openingStock: 0.5, receivedThisWeek: 0.2, reorderLevel: 0.1, unitCost: 22.00, supplier: 'Indian Grocers', category: 'Spices' },
    { id: 35, name: 'Eggs', unit: 'pieces', openingStock: 60, receivedThisWeek: 30, reorderLevel: 20, unitCost: 0.35, supplier: 'Local Supplier', category: 'Dairy' },
    { id: 36, name: 'Lemon Juice', unit: 'litre', openingStock: 3, receivedThisWeek: 2, reorderLevel: 1, unitCost: 4.80, supplier: 'Booker', category: 'Miscellaneous' },
    { id: 37, name: 'Gram Flour KTC', unit: 'kg', openingStock: 4, receivedThisWeek: 2, reorderLevel: 1, unitCost: 2.00, supplier: 'Pacific Seafood', category: 'Dry Items' },
    { id: 38, name: 'Rice Flour', unit: 'kg', openingStock: 5, receivedThisWeek: 3, reorderLevel: 2, unitCost: 2.80, supplier: 'Indian Grocers', category: 'Dry Items' },
    { id: 39, name: 'All Purpose Flour', unit: 'kg', openingStock: 10, receivedThisWeek: 5, reorderLevel: 3, unitCost: 1.90, supplier: 'Booker', category: 'Dry Items' },
    { id: 40, name: 'Curry Leaves', unit: 'bunch', openingStock: 20, receivedThisWeek: 10, reorderLevel: 5, unitCost: 1.50, supplier: 'Indian Grocers', category: 'Vegetables' }
  ]));

  // Complete recipes from PDF
  const [recipes, setRecipes] = useState(() => loadFromStorage('recipes', [
    // Salan (2KG recipe converted to per 1kg)
    { id: 1, dishName: 'Salan', ingredient: 'Peanuts', quantityPer1kg: 0.25, unit: 'kg' },
    { id: 2, dishName: 'Salan', ingredient: 'Coconut Dry', quantityPer1kg: 0.25, unit: 'kg' },
    { id: 3, dishName: 'Salan', ingredient: 'Fried Onions', quantityPer1kg: 0.2, unit: 'kg' },
    { id: 4, dishName: 'Salan', ingredient: 'Sesame Seeds', quantityPer1kg: 0.125, unit: 'kg' },
    { id: 5, dishName: 'Salan', ingredient: 'Chilli Powder', quantityPer1kg: 0.025, unit: 'kg' },
    { id: 6, dishName: 'Salan', ingredient: 'Turmeric Powder Natco', quantityPer1kg: 0.01, unit: 'kg' },
    { id: 7, dishName: 'Salan', ingredient: 'Coriander Powder', quantityPer1kg: 0.02, unit: 'kg' },
    { id: 8, dishName: 'Salan', ingredient: 'Salt', quantityPer1kg: 0.005, unit: 'kg' },
    { id: 9, dishName: 'Salan', ingredient: 'Tomato Puree', quantityPer1kg: 0.5, unit: 'kg' },
    { id: 10, dishName: 'Salan', ingredient: 'Vegetable Oil Rapeseed', quantityPer1kg: 0.075, unit: 'litre' },

    // Donne Biryani Lamb (converted to per 1kg)
    { id: 11, dishName: 'Donne Biryani Lamb', ingredient: 'Cooking Onion', quantityPer1kg: 0.05, unit: 'kg' },
    { id: 12, dishName: 'Donne Biryani Lamb', ingredient: 'Black Pepper', quantityPer1kg: 0.005, unit: 'kg' },
    { id: 13, dishName: 'Donne Biryani Lamb', ingredient: 'Green Cardamom', quantityPer1kg: 0.002, unit: 'kg' },
    { id: 14, dishName: 'Donne Biryani Lamb', ingredient: 'Mint Fresh', quantityPer1kg: 0.5, unit: 'bunch' },
    { id: 15, dishName: 'Donne Biryani Lamb', ingredient: 'Coriander Fresh', quantityPer1kg: 0.25, unit: 'bunch' },
    { id: 16, dishName: 'Donne Biryani Lamb', ingredient: 'Green Chillies', quantityPer1kg: 0.025, unit: 'kg' },
    { id: 17, dishName: 'Donne Biryani Lamb', ingredient: 'Lamb Meat', quantityPer1kg: 1.0, unit: 'kg' },
    { id: 18, dishName: 'Donne Biryani Lamb', ingredient: 'Chitti Muthayalu Rice', quantityPer1kg: 1.0, unit: 'kg' },
    { id: 19, dishName: 'Donne Biryani Lamb', ingredient: 'Vegetable Oil Rapeseed', quantityPer1kg: 0.02, unit: 'litre' },
    { id: 20, dishName: 'Donne Biryani Lamb', ingredient: 'Ghee Butter Heera', quantityPer1kg: 0.02, unit: 'kg' },
    { id: 21, dishName: 'Donne Biryani Lamb', ingredient: 'Ginger-Garlic Paste', quantityPer1kg: 0.045, unit: 'kg' },
    { id: 22, dishName: 'Donne Biryani Lamb', ingredient: 'Natural Yogurt', quantityPer1kg: 0.15, unit: 'kg' },

    // Prawns Pulav (converted to per 1kg)
    { id: 23, dishName: 'Prawns Pulav', ingredient: 'Raw Prawns', quantityPer1kg: 0.875, unit: 'kg' },
    { id: 24, dishName: 'Prawns Pulav', ingredient: 'Mint Fresh', quantityPer1kg: 0.5, unit: 'bunch' },
    { id: 25, dishName: 'Prawns Pulav', ingredient: 'Coriander Fresh', quantityPer1kg: 1, unit: 'bunch' },
    { id: 26, dishName: 'Prawns Pulav', ingredient: 'Ginger-Garlic Paste', quantityPer1kg: 0.1, unit: 'kg' },
    { id: 27, dishName: 'Prawns Pulav', ingredient: 'Green Chillies', quantityPer1kg: 0.018, unit: 'kg' },
    { id: 28, dishName: 'Prawns Pulav', ingredient: 'Cashew Nuts', quantityPer1kg: 0.03, unit: 'kg' },
    { id: 29, dishName: 'Prawns Pulav', ingredient: 'Salt', quantityPer1kg: 0.005, unit: 'kg' },
    { id: 30, dishName: 'Prawns Pulav', ingredient: 'Vegetable Oil Rapeseed', quantityPer1kg: 0.037, unit: 'litre' },
    { id: 31, dishName: 'Prawns Pulav', ingredient: 'Ghee Butter Heera', quantityPer1kg: 0.037, unit: 'kg' },
    { id: 32, dishName: 'Prawns Pulav', ingredient: 'Cooking Onion', quantityPer1kg: 0.25, unit: 'kg' },
    { id: 33, dishName: 'Prawns Pulav', ingredient: 'Salad Tomatoes', quantityPer1kg: 0.375, unit: 'kg' },
    { id: 34, dishName: 'Prawns Pulav', ingredient: 'Turmeric Powder Natco', quantityPer1kg: 0.006, unit: 'kg' },
    { id: 35, dishName: 'Prawns Pulav', ingredient: 'Chitti Muthayalu Rice', quantityPer1kg: 1.0, unit: 'kg' },

    // Chicken Pakora (5kg recipe converted to per 1kg)
    { id: 36, dishName: 'Chicken Pakora', ingredient: 'Boneless Chicken', quantityPer1kg: 1.0, unit: 'kg' },
    { id: 37, dishName: 'Chicken Pakora', ingredient: 'Vegetable Oil Rapeseed', quantityPer1kg: 0.03, unit: 'litre' },
    { id: 38, dishName: 'Chicken Pakora', ingredient: 'Chilli Powder', quantityPer1kg: 0.01, unit: 'kg' },
    { id: 39, dishName: 'Chicken Pakora', ingredient: 'Ginger-Garlic Paste', quantityPer1kg: 0.01, unit: 'kg' },
    { id: 40, dishName: 'Chicken Pakora', ingredient: 'Garam Masala Natco', quantityPer1kg: 0.006, unit: 'kg' },
    { id: 41, dishName: 'Chicken Pakora', ingredient: 'Eggs', quantityPer1kg: 1, unit: 'pieces' },
    { id: 42, dishName: 'Chicken Pakora', ingredient: 'Mint Fresh', quantityPer1kg: 0.2, unit: 'bunch' },
    { id: 43, dishName: 'Chicken Pakora', ingredient: 'Coriander Fresh', quantityPer1kg: 0.2, unit: 'bunch' },
    { id: 44, dishName: 'Chicken Pakora', ingredient: 'Kasoori Methi', quantityPer1kg: 0.003, unit: 'kg' },
    { id: 45, dishName: 'Chicken Pakora', ingredient: 'Salt', quantityPer1kg: 0.009, unit: 'kg' },
    { id: 46, dishName: 'Chicken Pakora', ingredient: 'Lemon Juice', quantityPer1kg: 0.01, unit: 'litre' },
    { id: 47, dishName: 'Chicken Pakora', ingredient: 'Gram Flour KTC', quantityPer1kg: 0.2, unit: 'kg' },
    { id: 48, dishName: 'Chicken Pakora', ingredient: 'Rice Flour', quantityPer1kg: 0.1, unit: 'kg' },
    { id: 49, dishName: 'Chicken Pakora', ingredient: 'All Purpose Flour', quantityPer1kg: 0.1, unit: 'kg' },

    // Chicken Curry (5kg recipe converted to per 1kg)
    { id: 50, dishName: 'Chicken Curry', ingredient: 'Boneless Chicken', quantityPer1kg: 1.0, unit: 'kg' },
    { id: 51, dishName: 'Chicken Curry', ingredient: 'Cooking Onion', quantityPer1kg: 0.2, unit: 'kg' },
    { id: 52, dishName: 'Chicken Curry', ingredient: 'Salad Tomatoes', quantityPer1kg: 0.15, unit: 'kg' },
    { id: 53, dishName: 'Chicken Curry', ingredient: 'Cashew Nuts', quantityPer1kg: 0.01, unit: 'kg' },
    { id: 54, dishName: 'Chicken Curry', ingredient: 'Coconut Dry', quantityPer1kg: 0.01, unit: 'kg' },
    { id: 55, dishName: 'Chicken Curry', ingredient: 'Kasoori Methi', quantityPer1kg: 0.007, unit: 'kg' },
    { id: 56, dishName: 'Chicken Curry', ingredient: 'Green Chillies', quantityPer1kg: 0.006, unit: 'kg' },
    { id: 57, dishName: 'Chicken Curry', ingredient: 'Salt', quantityPer1kg: 0.005, unit: 'kg' },
    { id: 58, dishName: 'Chicken Curry', ingredient: 'Curry Leaves', quantityPer1kg: 0.2, unit: 'bunch' },
    { id: 59, dishName: 'Chicken Curry', ingredient: 'Ginger-Garlic Paste', quantityPer1kg: 0.024, unit: 'kg' },
    { id: 60, dishName: 'Chicken Curry', ingredient: 'Vegetable Oil Rapeseed', quantityPer1kg: 0.024, unit: 'litre' },
    { id: 61, dishName: 'Chicken Curry', ingredient: 'Chilli Powder', quantityPer1kg: 0.006, unit: 'kg' },
    { id: 62, dishName: 'Chicken Curry', ingredient: 'Coriander Powder', quantityPer1kg: 0.004, unit: 'kg' },
    { id: 63, dishName: 'Chicken Curry', ingredient: 'Garam Masala Natco', quantityPer1kg: 0.004, unit: 'kg' },
    { id: 64, dishName: 'Chicken Curry', ingredient: 'Turmeric Powder Natco', quantityPer1kg: 0.003, unit: 'kg' },
    { id: 65, dishName: 'Chicken Curry', ingredient: 'Lemon Juice', quantityPer1kg: 0.001, unit: 'litre' },

    // Lamb Curry (3kg recipe converted to per 1kg)
    { id: 66, dishName: 'Lamb Curry', ingredient: 'Lamb Meat', quantityPer1kg: 1.0, unit: 'kg' },
    { id: 67, dishName: 'Lamb Curry', ingredient: 'Cooking Onion', quantityPer1kg: 0.2, unit: 'kg' },
    { id: 68, dishName: 'Lamb Curry', ingredient: 'Tomato Puree', quantityPer1kg: 0.33, unit: 'kg' },
    { id: 69, dishName: 'Lamb Curry', ingredient: 'Coconut Dry', quantityPer1kg: 0.007, unit: 'kg' },
    { id: 70, dishName: 'Lamb Curry', ingredient: 'Kasoori Methi', quantityPer1kg: 0.001, unit: 'kg' },
    { id: 71, dishName: 'Lamb Curry', ingredient: 'Green Chillies', quantityPer1kg: 0.01, unit: 'kg' },
    { id: 72, dishName: 'Lamb Curry', ingredient: 'Salt', quantityPer1kg: 0.005, unit: 'kg' },
    { id: 73, dishName: 'Lamb Curry', ingredient: 'Ginger-Garlic Paste', quantityPer1kg: 0.033, unit: 'kg' },
    { id: 74, dishName: 'Lamb Curry', ingredient: 'Vegetable Oil Rapeseed', quantityPer1kg: 0.02, unit: 'litre' },
    { id: 75, dishName: 'Lamb Curry', ingredient: 'Chilli Powder', quantityPer1kg: 0.01, unit: 'kg' },
    { id: 76, dishName: 'Lamb Curry', ingredient: 'Coriander Powder', quantityPer1kg: 0.007, unit: 'kg' },
    { id: 77, dishName: 'Lamb Curry', ingredient: 'Garam Masala Natco', quantityPer1kg: 0.008, unit: 'kg' },
    { id: 78, dishName: 'Lamb Curry', ingredient: 'Turmeric Powder Natco', quantityPer1kg: 0.003, unit: 'kg' }
  ]));






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
  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

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
  // Get dishes from recipes that have metadata
  const metadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
  return Object.keys(metadata).sort();
};

  // Helper: Get menu by location
  const getMenuByLocation = (location) => {
    if (location === 'all') {
      return menuItems;
    }
    return menuItems.filter(item => item.location === location);
  };


  const [newDispatchEntry, setNewDispatchEntry] = useState({
    dishName: '',
    totalCooked: '',
    easthamSent: '',
    bethnalSent: '',
    coldRoomStock: ''
  });

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
        const recipeDishes = [...new Set(recipes.map(r => r.dishName))].slice(0, 3);
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

      // Convert to database format
      const dbEntry = {
        dish_name: newEntry.dishName,
        quantity_cooked: newEntry.quantityCooked,
        prepared_by: newEntry.preparedBy,
        portion_size: newEntry.portionSize,
        container_size: newEntry.containerSize,
        total_portions: newEntry.totalPortions,
        processed: false,
        timestamp: newEntry.timestamp, // ADD THIS to database
        prep_time: newEntry.prepTime,
        status: 'fresh'
      };

      // Save to database
      await saveToDatabase('prep_log', dbEntry);

      // Keep existing local state update
      setPrepLog(prev => [...prev, newEntry]);

      // Reset form
      setNewPrepEntry({
        dishName: '',
        quantityCooked: '',
        containerSize: '500ml',
        portionSize: 160,
        preparedBy: newPrepEntry.preparedBy // Keep chef name
      });

      // Success message with portion config info
      const config = portionConfig[newEntry.dishName] || portionConfig['default'];
      alert(`✅ Successfully added ${totalPortions} portions of ${newEntry.dishName}!\n\n📦 Using ${config.containerSize} containers\n⚖️ ${config.portionSize}g per portion\n👨‍🍳 Prepared by ${newEntry.preparedBy}`);
    } else {
      alert('Please fill in all required fields');
    }
  };

// Find this function in your code and replace it with this fixed version:

const handleDispatchSubmit = async () => {  // ← Make sure 'async' is here!
  if (newDispatchEntry.dishName && newDispatchEntry.totalCooked) {
    const eastham = parseInt(newDispatchEntry.easthamSent) || 0;
    const bethnal = parseInt(newDispatchEntry.bethnalSent) || 0;
    const coldRoom = parseInt(newDispatchEntry.coldRoomStock) || 0;
    const total = parseInt(newDispatchEntry.totalCooked);

    // Keep your validation
    if (eastham + bethnal + coldRoom !== total) {
      alert(`❌ Invalid Distribution! Total: ${total}, but sum is ${eastham + bethnal + coldRoom}`);
      return;
    }

    const newEntry = {
      id: dispatch.length > 0 ? Math.max(...dispatch.map(d => d.id)) + 1 : 1,
      date: new Date().toISOString().split('T')[0],
      dishName: newDispatchEntry.dishName,
      totalCooked: total,
      easthamSent: eastham,
      bethnalSent: bethnal,
      coldRoomStock: coldRoom
    };

    // ⭐ ADD DATABASE SAVE
    const dbEntry = {
      dish_name: newEntry.dishName,
      total_cooked: newEntry.totalCooked,
      eastham_sent: newEntry.easthamSent,
      bethnal_sent: newEntry.bethnalSent,
      cold_room_stock: newEntry.coldRoomStock
    };

    await saveToDatabase('dispatch', dbEntry);  // ← This await is now inside an async function
    // ⭐ END DATABASE SAVE

    setDispatch(prev => [...prev, newEntry]);

    // AUTO-CREATE SALES ENTRIES FOR EACH LOCATION
    if (eastham > 0) {
      const easthamSalesEntry = {
        id: sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 100 : 100,
        dishName: newDispatchEntry.dishName,
        location: 'Eastham',
        receivedPortions: eastham,
        remainingPortions: eastham,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        updatedBy: 'Auto-Created from Dispatch',
        autoCreated: true
      };

      // ⭐ SAVE EASTHAM SALES TO DATABASE
      await saveToDatabase('sales', {
        dish_name: easthamSalesEntry.dishName,
        location: easthamSalesEntry.location,
        received_portions: easthamSalesEntry.receivedPortions,
        remaining_portions: easthamSalesEntry.remainingPortions,
        updated_by: easthamSalesEntry.updatedBy,
        auto_created: true
      });

      setSales(prev => [...prev, easthamSalesEntry]);
    }

    if (bethnal > 0) {
      const bethnalSalesEntry = {
        id: sales.length > 0 ? Math.max(...sales.map(s => s.id)) + 200 : 200,
        dishName: newDispatchEntry.dishName,
        location: 'Bethnal Green',
        receivedPortions: bethnal,
        remainingPortions: bethnal,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString(),
        updatedBy: 'Auto-Created from Dispatch',
        autoCreated: true
      };

      // ⭐ SAVE BETHNAL SALES TO DATABASE
      await saveToDatabase('sales', {
        dish_name: bethnalSalesEntry.dishName,
        location: bethnalSalesEntry.location,
        received_portions: bethnalSalesEntry.receivedPortions,
        remaining_portions: bethnalSalesEntry.remainingPortions,
        updated_by: bethnalSalesEntry.updatedBy,
        auto_created: true
      });

      setSales(prev => [...prev, bethnalSalesEntry]);
    }

    // Rest of your existing code...
    setPrepLog(prev => prev.map(p => {
      if (p.dishName === newDispatchEntry.dishName && !p.processed) {
        return { ...p, processed: true };
      }
      return p;
    }));

    setNewDispatchEntry({
      dishName: '',
      totalCooked: '',
      easthamSent: '',
      bethnalSent: '',
      coldRoomStock: ''
    });

    alert(`✅ Successfully dispatched ${total} portions of ${newDispatchEntry.dishName}!\n\n📍 Eastham: ${eastham}p (Sales entry auto-created)\n📍 Bethnal Green: ${bethnal}p (Sales entry auto-created)\n🏪 Cold Room: ${coldRoom}p`);
  } else {
    alert('Please fill in Dish Name and Total Available portions');
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

  const selectPrepItem = (prepItem) => {
    setNewDispatchEntry({
      dishName: prepItem.dishName,
      totalCooked: prepItem.totalPortions.toString(),
      easthamSent: Math.ceil(prepItem.totalPortions * 0.4).toString(), // Auto-suggest 40% to Eastham
      bethnalSent: Math.ceil(prepItem.totalPortions * 0.35).toString(), // Auto-suggest 35% to Bethnal Green
      coldRoomStock: Math.floor(prepItem.totalPortions * 0.25).toString() // Auto-suggest 25% to Cold Room
    });

    // Scroll to dispatch form
    document.querySelector('.dispatch-form')?.scrollIntoView({ behavior: 'smooth' });

    alert(`✅ Auto-filled dispatch form for ${prepItem.dishName}!\n\n📊 Suggested Distribution:\n• Eastham: ${Math.ceil(prepItem.totalPortions * 0.4)}p\n• Bethnal Green: ${Math.ceil(prepItem.totalPortions * 0.35)}p\n• Cold Room: ${Math.floor(prepItem.totalPortions * 0.25)}p\n\n👆 You can adjust these numbers before dispatching!`);
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


  // Dashboard Component
  const Dashboard = () => {
    const inventoryMetrics = getInventoryMetrics();
    const lowStockItems = inventoryMetrics.filter(item => item.closingBalance <= item.reorderLevel);
    const totalStockValue = inventoryMetrics.reduce((sum, item) => sum + item.stockValue, 0);
    const totalSoldPortions = sales.reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0);
    const wasteValue = wasteLog.reduce((sum, w) => sum + (w.value || 0), 0);

    return (
      <div className="p-6">



        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <BarChart3 className="mr-2" /> Kitchen Operations Dashboard
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Stock Value</p>
                <p className="text-2xl font-bold text-blue-600">£{totalStockValue.toFixed(2)}</p>
              </div>
              <Package className="text-blue-500" size={32} />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Portions Sold Today</p>
                <p className="text-2xl font-bold text-green-600">{totalSoldPortions}</p>
              </div>
              <CheckCircle className="text-green-500" size={32} />
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
              </div>
              <AlertTriangle className="text-red-500" size={32} />
            </div>
          </div>

          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Waste This Week</p>
                <p className="text-2xl font-bold text-orange-600">£{wasteValue.toFixed(2)}</p>
              </div>
              <Trash2 className="text-orange-500" size={32} />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Sales Performance by Location */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="mr-2" size={20} />
              Today's Sales Performance
            </h3>
            {['Eastham', 'Bethnal Green'].map(location => {
              const locationSales = sales.filter(s => s.location === location && !s.endOfDay);
              const received = locationSales.reduce((sum, s) => sum + s.receivedPortions, 0);
              const sold = locationSales.reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0);
              const sellRate = received > 0 ? (sold / received * 100).toFixed(0) : 0;

              return (
                <div key={location} className="mb-3 p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{location}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      sellRate >= 80 ? 'bg-green-100 text-green-800' :
                      sellRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {sellRate}% sold
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Received: {received}p | Sold: {sold}p | Remaining: {received - sold}p
                  </div>
                </div>


              );
            })}
          </div>

          {/* Cold Room Stock - Improved */}
  <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
    <h3 className="text-lg font-semibold mb-3 text-blue-900">
      🥶 Cold Room Stock (Remaining After Dispatch)
    </h3>
    {(() => {
      // Get items with remaining portions
      const coldRoomItems = prepLog.map(prep => {
        // Find all dispatches for this item
        const dispatches = dispatch.filter(d =>
          d.dishName === prep.dishName &&
          d.date === prep.date
        );

        const totalDispatched = dispatches.reduce((sum, d) =>
          sum + (d.easthamSent || 0) + (d.bethnalSent || 0), 0
        );

        const remaining = prep.totalPortions - totalDispatched;

        if (remaining > 0 && prep.status === 'prepared') {
          return {
            ...prep,
            remainingPortions: remaining,
            dispatchedPortions: totalDispatched,
            age: Math.floor((new Date() - new Date(prep.timestamp)) / (1000 * 60 * 60 * 24)) // days
          };
        }
        return null;
      }).filter(item => item !== null);

      // Group by dish
      const groupedByDish = coldRoomItems.reduce((acc, item) => {
        if (!acc[item.dishName]) {
          acc[item.dishName] = {
            dishName: item.dishName,
            totalRemaining: 0,
            oldestBatch: item.age,
            batches: []
          };
        }
        acc[item.dishName].totalRemaining += item.remainingPortions;
        acc[item.dishName].oldestBatch = Math.max(acc[item.dishName].oldestBatch, item.age);
        acc[item.dishName].batches.push({
          preparedBy: item.preparedBy,
          remaining: item.remainingPortions,
          age: item.age,
          date: item.date
        });
        return acc;
      }, {});

      return Object.keys(groupedByDish).length > 0 ? (
        <div className="space-y-3">
          {Object.values(groupedByDish)
            .sort((a, b) => b.oldestBatch - a.oldestBatch) // Oldest first
            .map((item, idx) => (
            <div key={idx} className={`p-3 rounded border ${
              item.oldestBatch >= 2 ? 'bg-red-50 border-red-300' :
              item.oldestBatch >= 1 ? 'bg-yellow-50 border-yellow-300' :
              'bg-white border-blue-300'
            }`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{item.dishName}</div>
                  <div className="text-sm text-gray-600">
                    Total in Cold Room: {item.totalRemaining} portions
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.batches.length} batch(es) • Oldest: {item.oldestBatch} day(s)
                  </div>
                </div>
                {item.oldestBatch >= 1 && (
                  <span className="text-xs font-medium text-red-600">
                    ⚠️ Dispatch First!
                  </span>
                )}
              </div>
            </div>
          ))}
          <div className="text-xs text-gray-600 italic">
            💡 Tip: Always dispatch older batches first to maintain freshness
          </div>
        </div>
      ) : (
        <p className="text-gray-600">No items in cold room - all fully dispatched!</p>
      );
    })()}
  </div>
          {/* Best Sellers */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <TrendingUp className="mr-2" size={20} />
              Today's Best Sellers
            </h3>
            {[...new Set(sales.map(s => s.dishName))]
              .map(dish => {
                const dishSales = sales.filter(s => s.dishName === dish);
                const totalSold = dishSales.reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0);
                return { dish, sold: totalSold };
              })
              .sort((a, b) => b.sold - a.sold)
              .slice(0, 3)
              .map((item, index) => (
                <div key={item.dish} className="flex justify-between items-center mb-2">
                  <span className="text-sm">
                    <span className="font-medium">{index + 1}.</span> {item.dish}
                  </span>
                  <span className="text-sm font-medium text-green-600">{item.sold}p</span>
                </div>
              ))
            }
          </div>

          {/* Cost Analysis */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <DollarSign className="mr-2" size={20} />
              Profit Margins
            </h3>
            {[...new Set(recipes.map(r => r.dishName))].slice(0, 3).map(dish => {
              const cost = calculateDishCost(dish);
              const sellingPrice = 8; // Assuming £8 per portion
              const margin = ((sellingPrice - cost * 0.16) / sellingPrice * 100).toFixed(0);

              return (
                <div key={dish} className="mb-3 p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{dish}</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      margin >= 60 ? 'bg-green-100 text-green-800' :
                      margin >= 40 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {margin}% margin
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Cost: £{(cost * 0.16).toFixed(2)} | Sell: £{sellingPrice}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Old Stock Alert */}
        {sales.filter(s => s.endOfDay && s.finalStock > 0).length > 0 && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2 flex items-center">
              <AlertTriangle className="mr-2" size={20} />
              🚨 OLD STOCK ALERT - Action Required!
            </h3>
            <div className="space-y-2">
              {sales.filter(s => s.endOfDay && s.finalStock > 0).map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-red-700">{item.dishName} ({item.location})</span>
                  <span className="text-red-600 font-medium">
                    {item.finalStock} portions - PUT ON OFFER!
                  </span>
                </div>
              ))}
              <div className="mt-2 text-sm text-red-600">
                → Go to "Old Stock Offers" tab for pricing strategies
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Tomorrow's Cooking Forecast</h3>
            <div className="space-y-3">
              {generateForecast().map((forecast, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{forecast.dish}</p>
                    <p className="text-sm text-gray-600">Cook: {forecast.qtyToCook}kg</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Cold Room: {forecast.coldRoomStock} | Remaining: {forecast.totalRemaining}</p>
                    <p className="font-medium text-green-600">£{forecast.cost.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Recipe Cost Summary</h3>
            <div className="space-y-3">
              {[...new Set(recipes.map(r => r.dishName))].map(dish => (
                <div key={dish} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">{dish}</span>
                  <div className="text-right">
                    <p className="font-bold text-green-600">£{calculateDishCost(dish).toFixed(2)}/kg</p>
                    <p className="text-sm text-gray-600">£{(calculateDishCost(dish) * 0.16).toFixed(2)}/portion</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Old Stock Manager Component - FIXED
  const OldStockManager = () => {
    const oldStockItems = sales.filter(s => s.endOfDay && s.finalStock > 0);
    const groupedByLocation = oldStockItems.reduce((groups, item) => {
      if (!groups[item.location]) groups[item.location] = [];
      groups[item.location].push(item);
      return groups;
    }, {});

    const totalOldStock = oldStockItems.reduce((sum, item) => sum + item.finalStock, 0);
    const totalValue = oldStockItems.reduce((sum, item) => sum + (item.finalStock * 8), 0); // Assuming £8 per portion

    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <AlertTriangle className="mr-2 text-orange-600" /> Old Stock Manager - PRIORITY OFFERS!
        </h2>

        {/* Summary */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-orange-800 mb-3">🚨 ACTION REQUIRED: Old Stock Must Be Sold First!</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Old Stock</p>
              <p className="text-2xl font-bold text-orange-600">{totalOldStock} portions</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Locations Affected</p>
              <p className="text-2xl font-bold text-orange-600">{Object.keys(groupedByLocation).length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Estimated Value</p>
              <p className="text-2xl font-bold text-green-600">£{totalValue.toFixed(0)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Days Old</p>
              <p className="text-2xl font-bold text-red-600">1-2 days</p>
            </div>
          </div>
        </div>

        {totalOldStock === 0 ? (
          <div className="text-center py-12">
            <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
            <h3 className="text-xl font-semibold text-green-600 mb-2">No Old Stock! 🎉</h3>
            <p className="text-gray-600">All items were sold. Excellent inventory management!</p>
          </div>
        ) : (
          <>
            {/* Recommended Actions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">💡 Immediate Action Plan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium text-yellow-700 mb-2">🏷️ PRICING STRATEGIES:</h4>
                  <ul className="space-y-1 text-yellow-700">
                    <li>• <strong>20-30% OFF</strong> on day-old items</li>
                    <li>• <strong>"Buy 2 Get 1 Free"</strong> combo offers</li>
                    <li>• <strong>Lunch Special</strong> pricing (£5-6)</li>
                    <li>• <strong>Staff Meal</strong> discounts (50% off)</li>
                    <li>• <strong>Happy Hour</strong> 3-6pm deals</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-yellow-700 mb-2">📢 MARKETING ACTIONS:</h4>
                  <ul className="space-y-1 text-yellow-700">
                    <li>• <strong>Social Media</strong> flash sale posts</li>
                    <li>• <strong>"Chef's Special"</strong> menu board</li>
                    <li>• <strong>WhatsApp</strong> customer alerts</li>
                    <li>• <strong>Delivery Apps</strong> promo codes</li>
                    <li>• <strong>Walk-in</strong> verbal offers</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Old Stock by Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(groupedByLocation).map(([location, items]) => (
                <div key={location} className="bg-white border-2 border-orange-300 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4 text-orange-800">📍 {location} Old Stock</h3>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div key={item.id} className="border-l-4 border-orange-400 pl-4 py-2 bg-orange-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-800">{item.dishName}</h4>
                            <p className="text-sm text-gray-600">
                              OLD STOCK: <span className="font-bold text-orange-600">{item.finalStock} portions</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Closed: {item.closedDate || 'Yesterday'} at {item.closedTime || 'EOD'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Original received: {item.receivedPortions}p | Sold: {item.receivedPortions - item.finalStock}p
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-medium">
                              URGENT
                            </span>
                            <div className="text-xs text-green-600 mt-1">
                              Value: £{(item.finalStock * 8).toFixed(0)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-xs space-x-2">
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            💰 Suggest: 25% OFF (£6 each)
                          </span>
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
                            🚨 SELL TODAY!
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-orange-100 rounded">
                    <div className="text-sm">
                      <div className="font-medium text-orange-800">Location Action Summary:</div>
                      <div>Total Old Stock: <span className="font-bold">{items.reduce((sum, i) => sum + i.finalStock, 0)} portions</span></div>
                      <div>Potential Revenue: <span className="font-bold text-green-600">£{(items.reduce((sum, i) => sum + i.finalStock, 0) * 6).toFixed(0)}</span> (at 25% off)</div>
                      <div className="text-orange-700 font-medium mt-1">⚡ Priority: Create offers NOW!</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Suggested Offer Templates */}
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">📝 Ready-to-Use Offer Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-green-700 mb-2">🎯 SOCIAL MEDIA POST:</h4>
                  <div className="bg-gray-50 p-2 rounded text-xs italic">
                    "🔥 FLASH SALE ALERT! Chef's Special Today Only - Premium {oldStockItems[0]?.dishName || 'Biryani'} £6 (Was £8)
                    Limited portions available! DM to reserve yours 📱
                    #ChefSpecial #LimitedOffer #AuthenticFlavors"
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <h4 className="font-medium text-green-700 mb-2">🪧 STORE BOARD:</h4>
                  <div className="bg-gray-50 p-2 rounded text-xs italic">
                    "TODAY'S CHEF SPECIAL
                    {oldStockItems.map(item => `${item.dishName} - £6 (25% OFF)`).join('\n')}
                    Made Yesterday - Same Great Taste!
                    Available while stocks last"
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
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
                {[...new Set(recipes.map(r => r.dishName))].map(dish => (
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
            <h1 className="text-2xl font-bold text-gray-900">Kitchen ERP System</h1>
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
              <div>👑 Owner: owner / owner123</div>
              <div>💼 Manager: manager / manager123</div>
              <div>👨‍🍳 Chef: vasanth / chef123</div>
              <div>👥 Staff: eastham / staff123</div>
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
        <h1 className="text-xl font-bold text-gray-900">WHEELFEST KITCHEN MANAGEMENT</h1>
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
          {activeTab === 'dashboard' && <Dashboard />}

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
            />
          )}



    {activeTab === 'dispatch' && (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <Truck className="mr-2" /> Dispatch & Cold Room Management
        </h2>

        {/* Quick Tutorial */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 How Dispatch Works (3 Easy Steps)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-blue-700 mb-2">1️⃣ CLICK PREP ITEM</div>
              <div className="text-gray-700">
                👆 Click any green card below to auto-fill the dispatch form<br/>
                ✅ Smart distribution suggestions included<br/>
                ✅ All prep data filled automatically
              </div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-orange-700 mb-2">2️⃣ ADJUST PORTIONS</div>
              <div className="text-gray-700">
                📝 Modify Eastham/Bethnal Green portions as needed<br/>
                🔄 Cold Room stock auto-calculates<br/>
                ✅ Live total validation
              </div>
            </div>
            <div className="bg-white p-3 rounded">
              <div className="font-medium text-green-700 mb-2">3️⃣ DISPATCH</div>
              <div className="text-gray-700">
                🚀 Click "Dispatch & Create Sales"<br/>
                ✅ Sales entries auto-created for both locations<br/>
                ✅ Prep item marked as processed
              </div>
            </div>
          </div>
        </div>

        {/* Quick Select from Prep Log */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-green-800">📋 Ready for Dispatch (From Today's Prep)</h3>
          <p className="text-sm text-green-700 mb-3">👆 Click any item below to auto-fill the dispatch form with smart distribution suggestions</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {prepLog.filter(prep => !prep.processed).length > 0 ?
              prepLog.filter(prep => !prep.processed).map(prep => (
                <div
                  key={`prep-${prep.id}`}
                  className="bg-white rounded-lg p-4 border-2 border-green-200 cursor-pointer hover:border-green-400 hover:shadow-md transform hover:scale-105 transition-all duration-200"
                  onClick={() => selectPrepItem(prep)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-green-800">{prep.dishName}</span>
                    <span className="text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                      {prep.totalPortions}p ready
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    📊 {prep.quantityCooked}kg | {prep.containerSize} | by {prep.preparedBy}
                  </div>
                  <div className="text-xs text-blue-600 font-medium bg-blue-50 p-2 rounded text-center">
                    👆 CLICK HERE to auto-fill dispatch form
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Will suggest: ~{Math.ceil(prep.totalPortions * 0.4)}p Eastham, ~{Math.ceil(prep.totalPortions * 0.35)}p Bethnal, ~{Math.floor(prep.totalPortions * 0.25)}p Cold Room
                  </div>
                </div>
              ))
              :
              <div className="col-span-3">
                <div className="text-center py-8">
                  <ChefHat size={48} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-green-700 font-medium">No prep items ready for dispatch</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Go to <span className="font-medium">"Prep Log"</span> tab to add new cooked items first.
                  </p>
                </div>
              </div>
            }
          </div>

          {/* Summary */}
          {prepLog.filter(prep => !prep.processed).length > 0 && (
            <div className="mt-4 p-3 bg-white rounded border border-green-200">
              <div className="text-sm text-green-800">
                <strong>📊 Ready to Dispatch Summary:</strong>
                <span className="ml-2">
                  {prepLog.filter(prep => !prep.processed).length} items |
                  {prepLog.filter(prep => !prep.processed).reduce((sum, prep) => sum + prep.totalPortions, 0)} total portions |
                  £{prepLog.filter(prep => !prep.processed).reduce((sum, prep) => sum + (calculateDishCost(prep.dishName) * prep.quantityCooked), 0).toFixed(2)} total value
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Add New Dispatch Entry */}
        <div className="dispatch-form bg-white border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">📦 Dispatch Form - Auto-filled from Prep Selection</h3>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Dish Name *</label>
              <input
                type="text"
                value={newDispatchEntry.dishName}
                onChange={(e) => setNewDispatchEntry(prev => ({ ...prev, dishName: e.target.value }))}
                className="w-full p-2 border rounded bg-gray-50"
                placeholder="Click prep item above to auto-fill"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 whitespace-nowrap">
                Total Available (portions) *
              </label>
              <input
                type="number"
                value={newDispatchEntry.totalCooked}
                onChange={(e) => setNewDispatchEntry(prev => ({ ...prev, totalCooked: e.target.value }))}
                className="w-full p-2 border rounded bg-gray-50"
                placeholder="Auto-filled"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Eastham Sent</label>
              <input
                type="number"
                value={newDispatchEntry.easthamSent}
                onChange={(e) => {
                  const eastham = parseInt(e.target.value) || 0;
                  const bethnal = parseInt(newDispatchEntry.bethnalSent) || 0;
                  const total = parseInt(newDispatchEntry.totalCooked) || 0;
                  const coldRoom = Math.max(0, total - eastham - bethnal);
                  setNewDispatchEntry(prev => ({
                    ...prev,
                    easthamSent: e.target.value,
                    coldRoomStock: coldRoom.toString()
                  }));
                }}
                className="w-full p-2 border-2 border-blue-300 rounded focus:border-blue-500"
                placeholder="Adjust as needed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bethnal Green Sent</label>
              <input
                type="number"
                value={newDispatchEntry.bethnalSent}
                onChange={(e) => {
                  const bethnal = parseInt(e.target.value) || 0;
                  const eastham = parseInt(newDispatchEntry.easthamSent) || 0;
                  const total = parseInt(newDispatchEntry.totalCooked) || 0;
                  const coldRoom = Math.max(0, total - eastham - bethnal);
                  setNewDispatchEntry(prev => ({
                    ...prev,
                    bethnalSent: e.target.value,
                    coldRoomStock: coldRoom.toString()
                  }));
                }}
                className="w-full p-2 border-2 border-green-300 rounded focus:border-green-500"
                placeholder="Adjust as needed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cold Room Stock (auto)</label>
              <input
                type="number"
                value={newDispatchEntry.coldRoomStock}
                className="w-full p-2 border rounded bg-purple-50"
                placeholder="Auto calculated"
                readOnly
              />
              <div className="text-xs text-purple-600 mt-1">
                Auto: Total - Eastham - Bethnal
              </div>
            </div>
            <div className="flex items-end space-x-2">
              <button
                onClick={handleDispatchSubmit}
                disabled={!newDispatchEntry.dishName || !newDispatchEntry.totalCooked}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Plus size={16} className="inline mr-1" />
                Dispatch & Create Sales
              </button>
              <button
                onClick={() => setNewDispatchEntry({
                  dishName: '',
                  totalCooked: '',
                  easthamSent: '',
                  bethnalSent: '',
                  coldRoomStock: ''
                })}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                title="Clear form"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Live Total Check */}
          {newDispatchEntry.totalCooked && (newDispatchEntry.easthamSent || newDispatchEntry.bethnalSent || newDispatchEntry.coldRoomStock) && (
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm">
                <div className="flex justify-between items-center">
                  <span>Distribution Check:</span>
                  <span className={`font-bold ${
                    (parseInt(newDispatchEntry.easthamSent) || 0) + (parseInt(newDispatchEntry.bethnalSent) || 0) + (parseInt(newDispatchEntry.coldRoomStock) || 0) === parseInt(newDispatchEntry.totalCooked)
                    ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(parseInt(newDispatchEntry.easthamSent) || 0) + (parseInt(newDispatchEntry.bethnalSent) || 0) + (parseInt(newDispatchEntry.coldRoomStock) || 0)} / {newDispatchEntry.totalCooked} portions
                  </span>
                </div>
                {(parseInt(newDispatchEntry.easthamSent) || 0) + (parseInt(newDispatchEntry.bethnalSent) || 0) + (parseInt(newDispatchEntry.coldRoomStock) || 0) === parseInt(newDispatchEntry.totalCooked) ? (
                  <div className="text-green-600 text-xs mt-1">✅ Perfect! Ready to dispatch</div>
                ) : (
                  <div className="text-red-600 text-xs mt-1">⚠️ Numbers don't add up - please adjust</div>
                )}
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
            {dispatch.length > 0 ? (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Dish Name</th>
                    <th className="px-4 py-2 text-left">Total Cooked</th>
                    <th className="px-4 py-2 text-left">Eastham Sent</th>
                    <th className="px-4 py-2 text-left">Bethnal Green Sent</th>
                    <th className="px-4 py-2 text-left">Cold Room Stock</th>
                    <th className="px-4 py-2 text-left">Total Dispatched</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dispatch.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 font-medium">{item.dishName}</td>
                      <td className="px-4 py-2">{item.totalCooked}p</td>
                      <td className="px-4 py-2 text-blue-600">{item.easthamSent}p</td>
                      <td className="px-4 py-2 text-green-600">{item.bethnalSent}p</td>
                      <td className="px-4 py-2 text-purple-600">{item.coldRoomStock}p</td>
                      <td className="px-4 py-2 font-medium">{item.easthamSent + item.bethnalSent}p</td>
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
    )}


      {activeTab === 'sales' && (
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <DollarSign className="mr-2" /> Sales & Stock Management
          </h2>

          {/* Location Selector & Shop Status */}
          <div className="mb-6 bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="font-medium">Location:</label>
                <select
                  value={selectedSalesLocation}
                  onChange={(e) => setSelectedSalesLocation(e.target.value)}
                  className="px-4 py-2 border rounded-lg text-lg font-medium"
                >
                  <option value="Eastham">📍 Eastham</option>
                  <option value="Bethnal Green">📍 Bethnal Green</option>
                </select>
              </div>

              {/* Shop Status & Controls */}
              <div className="flex items-center space-x-4">
                <div className={`px-4 py-2 rounded-lg font-medium ${
                  shopStatuses[selectedSalesLocation] === 'open'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  Status: {shopStatuses[selectedSalesLocation] === 'open' ? '🟢 OPEN' : '🔴 CLOSED'}
                </div>

                <button
                  onClick={() => {
                    if (shopStatuses[selectedSalesLocation] === 'open') {
                      // Closing shop
                      if (window.confirm(`Close ${selectedSalesLocation} for the day? Remaining stock will become OLD STOCK.`)) {
                        handleEndOfDay(selectedSalesLocation);
                        const newStatuses = { ...shopStatuses };
                        newStatuses[selectedSalesLocation] = 'closed';
                        setShopStatuses(newStatuses);
                        localStorage.setItem('shopStatuses', JSON.stringify(newStatuses));
                      }
                    } else {
                      // Opening shop
                      const newStatuses = { ...shopStatuses };
                      const newOpenTimes = { ...shopOpenTimes };
                      newStatuses[selectedSalesLocation] = 'open';
                      newOpenTimes[selectedSalesLocation] = new Date().toISOString();
                      setShopStatuses(newStatuses);
                      setShopOpenTimes(newOpenTimes);
                      localStorage.setItem('shopStatuses', JSON.stringify(newStatuses));
                      localStorage.setItem('shopOpenTimes', JSON.stringify(newOpenTimes));
                    }
                  }}
                  className={`px-6 py-2 rounded-lg text-white font-medium ${
                    shopStatuses[selectedSalesLocation] === 'closed'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {shopStatuses[selectedSalesLocation] === 'closed' ? '🔓 OPEN SHOP' : '🔒 CLOSE SHOP'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">
                {sales.filter(s => s.location === selectedSalesLocation && !s.endOfDay)
                  .reduce((sum, s) => sum + (s.receivedPortions - s.remainingPortions), 0)}
              </div>
              <div className="text-sm text-gray-600">Sold Today</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">
                {sales.filter(s => s.location === selectedSalesLocation && !s.endOfDay)
                  .reduce((sum, s) => sum + s.remainingPortions, 0)}
              </div>
              <div className="text-sm text-gray-600">Current Stock</div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">
                {sales.filter(s => s.location === selectedSalesLocation && s.endOfDay && s.finalStock > 0)
                  .reduce((sum, s) => sum + s.finalStock, 0)}
              </div>
              <div className="text-sm text-gray-600">Old Stock</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">
                {menuItems.filter(item => {
                  const sale = sales.find(s =>
                    s.dishName === item.dish_name &&
                    s.location === selectedSalesLocation &&
                    !s.endOfDay
                  );
                  const oldStock = sales.filter(s =>
                    s.dishName === item.dish_name &&
                    s.location === selectedSalesLocation &&
                    s.endOfDay &&
                    s.finalStock > 0
                  ).reduce((sum, s) => sum + s.finalStock, 0);
                  return (sale ? sale.remainingPortions : 0) + oldStock === 0;
                }).length}
              </div>
              <div className="text-sm text-gray-600">Out of Stock</div>
            </div>
          </div>

          {/* Search Box */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="🔍 Search menu items..."
              value={stockSearchTerm}
              onChange={(e) => setStockSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-lg"
            />
          </div>

          {/* Main Stock Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Menu Item</th>
                    <th className="px-4 py-3 text-center">Category</th>
                    <th className="px-4 py-3 text-center">Old Stock</th>
                    <th className="px-4 py-3 text-center">Received Today</th>
                    <th className="px-4 py-3 text-center">Remaining</th>
                    <th className="px-4 py-3 text-center">Sold Today</th>
                    <th className="px-4 py-3 text-center">Total Available</th>
                    <th className="px-4 py-3 text-center">Update Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems
                    .filter(item =>
                      (item.location === selectedSalesLocation || item.location === 'Both') &&
                      item.dish_name.toLowerCase().includes(stockSearchTerm.toLowerCase())
                    )
                    .map((menuItem, index) => {
                      // Get current sales data
                      const currentSale = sales.find(s =>
                        s.dishName === menuItem.dish_name &&
                        s.location === selectedSalesLocation &&
                        !s.endOfDay
                      );

                      // Get old stock
                      const oldStock = sales.filter(s =>
                        s.dishName === menuItem.dish_name &&
                        s.location === selectedSalesLocation &&
                        s.endOfDay &&
                        s.finalStock > 0
                      ).reduce((sum, s) => sum + s.finalStock, 0);

                      // Calculate values
                      const dispatchedToday = currentSale ? currentSale.receivedPortions : 0;
                      const remainingToday = currentSale ? currentSale.remainingPortions : 0;
                      const soldToday = dispatchedToday - remainingToday;
                      const totalAvailable = remainingToday + oldStock;

                      // Determine row color
                      let rowClass = '';
                      if (totalAvailable === 0) rowClass = 'bg-red-50';
                      else if (totalAvailable < 10) rowClass = 'bg-yellow-50';
                      else if (oldStock > 0) rowClass = 'bg-orange-50';

                      return (
                        <tr key={index} className={rowClass}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{menuItem.dish_name}</div>
                            <div className="text-xs text-gray-500">
                              {menuItem.price ? `£${menuItem.price}` : 'Price not set'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                              {menuItem.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {oldStock > 0 ? (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-sm font-medium">
                                {oldStock}p 🚨
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-medium">
                            {dispatchedToday > 0 ? (
                              <span className="text-blue-600">{dispatchedToday}p</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editingSalesItem === currentSale?.id ? (
                              <input
                                type="number"
                                value={newSalesEntry.remainingPortions}
                                onChange={(e) => setNewSalesEntry(prev => ({
                                  ...prev,
                                  remainingPortions: e.target.value
                                }))}
                                className="w-20 px-2 py-1 border-2 border-blue-500 rounded text-center"
                                autoFocus
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateSalesItem();
                                  }
                                }}
                              />
                            ) : (
                              <span className={`font-medium ${
                                remainingToday === 0 ? 'text-green-600' : 'text-gray-700'
                              }`}>
                                {remainingToday}p
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {soldToday > 0 ? (
                              <span className="text-green-600 font-bold">{soldToday}p</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-lg ${
                              totalAvailable === 0 ? 'text-red-600' :
                              totalAvailable < 10 ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {totalAvailable}p
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {currentSale && editingSalesItem !== currentSale.id ? (
                              <button
                                onClick={() => handleEditSalesItem(currentSale)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Update
                              </button>
                            ) : editingSalesItem === currentSale?.id ? (
                              <div className="flex space-x-1 justify-center">
                                <button
                                  onClick={handleUpdateSalesItem}
                                  className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSalesItem(null);
                                    setNewSalesEntry({
                                      location: '',
                                      dishName: '',
                                      receivedPortions: '',
                                      remainingPortions: ''
                                    });
                                  }}
                                  className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                  ✗
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Not dispatched</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <div className="flex flex-wrap gap-4 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-50 border rounded mr-2"></div>
                <span>Out of Stock</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-50 border rounded mr-2"></div>
                <span>Low Stock (&lt;10)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-50 border rounded mr-2"></div>
                <span>Has Old Stock (sell first!)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-white border rounded mr-2"></div>
                <span>Good Stock</span>
              </div>
            </div>
          </div>
        </div>
      )}

          {activeTab === 'old-stock' && <OldStockManager />}

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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other tabs would go here */}
          {activeTab === 'smart-planning' && (
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 flex items-center">
                <Calendar className="mr-2" /> Smart Planning & Old Stock Analysis
              </h2>

              {/* Location Selector */}
              <div className="mb-6 flex space-x-4">
                <select
                  className="px-4 py-2 border rounded-lg"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  <option value="all">All Locations</option>
                  <option value="Eastham">Eastham</option>
                  <option value="Bethnal Green">Bethnal Green</option>
                </select>
              </div>

              {/* What to Cook First - Location Based */}
              <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-yellow-900">
                  🔥 Priority Cooking List {selectedLocation !== 'all' && `- ${selectedLocation}`}
                </h3>
                <div className="space-y-3">
                  {getLocationBasedPriorities(selectedLocation).length > 0 ? (
                    getLocationBasedPriorities(selectedLocation).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg">
                        <div>
                          <span className="font-medium">{item.dish}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({item.location})
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-600">Stock: {item.currentStock} portions</div>
                          <div className="text-sm text-green-600">Need: {item.needed} portions</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">All dishes are well-stocked for {selectedLocation === 'all' ? 'all locations' : selectedLocation}!</p>
                  )}
                </div>
              </div>

              {/* Rest of existing smart planning content continues below... */}


              {/* Old Stock Alert */}
              {sales.filter(s => s.endOfDay && s.finalStock > 0).length > 0 && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-red-800 mb-3">🚨 PRIORITY: Old Stock Must Be Sold First!</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['Eastham', 'Bethnal Green'].map(location => {
                      const locationOldStock = sales.filter(s => s.location === location && s.endOfDay && s.finalStock > 0);
                      return locationOldStock.length > 0 && (
                        <div key={location} className="bg-white p-3 rounded border">
                          <h4 className="font-medium text-red-700 mb-2">📍 {location} Old Stock:</h4>
                          {locationOldStock.map(stock => (
                            <div key={stock.id} className="text-sm">
                              • <span className="font-medium">{stock.dishName}</span>: {stock.finalStock} portions (PUT ON OFFER!)
                            </div>
                          ))}
                          <div className="mt-2 text-xs text-red-600 font-medium">
                            → Go to "Old Stock Offers" tab for pricing strategies
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Tomorrow's Intelligent Cooking Plan</h3>

                <div className="space-y-4">
                  {generateForecast().map((forecast, index) => {
                    // Check if this dish has old stock
                    const hasOldStock = sales.some(s => s.dishName === forecast.dish && s.endOfDay && s.finalStock > 0);
                    const oldStockCount = sales.filter(s => s.dishName === forecast.dish && s.endOfDay && s.finalStock > 0)
                                                 .reduce((sum, s) => sum + s.finalStock, 0);

                    return (
                      <div key={index} className={`border-2 rounded-lg p-4 ${
                        hasOldStock ? 'bg-red-50 border-red-500' : 'bg-blue-50 border-blue-500'
                      }`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <h4 className="text-xl font-semibold">{forecast.dish}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              hasOldStock ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800'
                            }`}>
                              {hasOldStock ? '🚨 HAS OLD STOCK' : (forecast.priority || 'MEDIUM')}
                            </span>
                            {hasOldStock && (
                              <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-medium">
                                {oldStockCount}p OLD
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">£{(forecast.cost || 0).toFixed(2)}</div>
                            <div className="text-sm text-gray-500">Cook: {forecast.qtyToCook || 0}kg</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Expected Demand</div>
                            <div className="text-lg font-bold text-blue-600">{forecast.expectedDemand}p</div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Cold Room Stock</div>
                            <div className="text-lg font-bold text-purple-600">{forecast.coldRoomStock}p</div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Location Remaining</div>
                            <div className="text-lg font-bold text-orange-600">{forecast.totalRemaining}p</div>
                          </div>
                          <div className="bg-white p-3 rounded border">
                            <div className="text-sm text-gray-600">Old Stock</div>
                            <div className={`text-lg font-bold ${hasOldStock ? 'text-red-600' : 'text-green-600'}`}>
                              {oldStockCount}p
                            </div>
                          </div>
                        </div>

                        <div className={`p-4 rounded-lg text-center font-medium ${
                          hasOldStock
                            ? 'bg-red-100 text-red-800'
                            : forecast.totalRemaining > forecast.expectedDemand * 0.5
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          📋 <strong>Action Plan:</strong> {
                            hasOldStock
                              ? `🚨 PRIORITY: Sell ${oldStockCount}p old stock first! Reduce new cooking or skip entirely.`
                              : forecast.totalRemaining > forecast.expectedDemand * 0.5
                                ? 'REDUCE COOKING - Use existing stock first'
                                : 'NORMAL COOKING - Fresh prep needed'
                          }
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
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
