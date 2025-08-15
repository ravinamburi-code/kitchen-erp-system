// EnhancedRecipeBank.js - UPDATED VERSION WITH MANUAL TOTAL PORTIONS
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  ChefHat, Plus, Edit, Trash2, Save, X, Calculator,
  Package, AlertTriangle, CheckCircle, DollarSign
} from 'lucide-react';

const EnhancedRecipeBank = ({
  recipes = [],
  setRecipes = () => {},
  inventory = [],
  setInventory = () => {},
  userRole = 'staff',
  calculateDishCost = () => 0
}) => {
  // Database state
  const [recipeBank, setRecipeBank] = useState([]);
  const [loading, setLoading] = useState(true);

  // Container sizes configuration
  const containerSizes = [
    '500ml', '650ml', '750ml', '1000ml',
    '8oz', '12oz', '4oz', '2 Liter', 'Other'
  ];

  // State for managing recipes
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [customContainer, setCustomContainer] = useState('');

  // New recipe form state
  const [newRecipe, setNewRecipe] = useState({
    dishName: '',
    rawWeight: '',
    cookedWeight: '',
    containerSize: '500ml',
    customContainerSize: '',
    portionsPerKg: '',
    portionSize: '',
    totalPortions: '', // Added manual total portions field
    category: 'Main Course',
    ingredients: [],
    notes: ''
  });

  // New ingredient form
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    quantity: '',
    unit: 'kg',
    isNewToInventory: false,
    category: 'Dry Items',
    supplier: 'Local Supplier',
    unitCost: '',
    reorderLevel: ''
  });

  // Autocomplete states
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);
  const [filteredInventory, setFilteredInventory] = useState([]);

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

  // Filter inventory items as user types
  useEffect(() => {
    if (newIngredient.name && inventory && inventory.length > 0) {
      const filtered = inventory.filter(item =>
        item.name && item.name.toLowerCase().includes(newIngredient.name.toLowerCase())
      );
      setFilteredInventory(filtered);
      setShowIngredientDropdown(filtered.length > 0);
    } else {
      setFilteredInventory([]);
      setShowIngredientDropdown(false);
    }
  }, [newIngredient.name, inventory]);

  // Load recipes from database
  useEffect(() => {
    const loadRecipesFromDatabase = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('recipe_bank')
          .select('*')
          .order('dish_name');

        if (error) throw error;

        if (data) {
          setRecipeBank(data);
          console.log('Loaded', data.length, 'recipes from database');

          // Also update the old recipes format for compatibility
          const formattedRecipes = [];
          let recipeId = 1;

          data.forEach(recipe => {
            if (recipe.ingredients && recipe.ingredients !== '[]') {
              try {
                const ingredients = safeParseIngredients(recipe.ingredients);

                ingredients.forEach(ing => {
                  formattedRecipes.push({
                    id: recipeId++,
                    dishName: recipe.dish_name,
                    ingredient: ing.item,
                    quantityPer1kg: ing.quantity,
                    unit: ing.unit
                  });
                });
              } catch (e) {
                console.error('Error parsing ingredients for', recipe.dish_name, e);
              }
            }
          });

          if (formattedRecipes.length > 0) {
            setRecipes(formattedRecipes);
          }
        }
      } catch (error) {
        console.error('Error loading recipe bank:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecipesFromDatabase();
  }, [setRecipes]);

  // Calculate yield percentage
  const calculateYield = (raw, cooked) => {
    if (raw && cooked && parseFloat(raw) > 0) {
      return ((parseFloat(cooked) / parseFloat(raw)) * 100).toFixed(1);
    }
    return 0;
  };

  // Calculate portions per kg based on total portions and cooked weight
  const calculatePortionsPerKg = () => {
    if (newRecipe.totalPortions && newRecipe.cookedWeight) {
      const cookedWeight = parseFloat(newRecipe.cookedWeight);
      const totalPortions = parseFloat(newRecipe.totalPortions);

      if (cookedWeight > 0 && totalPortions > 0) {
        const portionsPerKg = totalPortions / cookedWeight;
        return portionsPerKg.toFixed(1);
      }
    }
    return '';
  };

  // Update portions per kg when total portions or cooked weight changes
  useEffect(() => {
    const portionsPerKg = calculatePortionsPerKg();
    if (portionsPerKg) {
      setNewRecipe(prev => ({ ...prev, portionsPerKg }));
    }
  }, [newRecipe.totalPortions, newRecipe.cookedWeight]);

  // Load recipe for editing from database
  const startEditingRecipe = async (recipeData) => {
    console.log('Starting to edit recipe:', recipeData.dish_name);

    // Parse ingredients from database
    let ingredients = [];
    if (recipeData.ingredients && recipeData.ingredients !== '[]') {
      try {
        const parsedIngredients = safeParseIngredients(recipeData.ingredients);

        ingredients = parsedIngredients.map((ing, index) => ({
          id: Date.now() + index,
          ingredient: ing.item,
          quantityPer1kg: ing.quantity,
          unit: ing.unit,
          cost: 0
        }));
      } catch (e) {
        console.error('Error parsing ingredients:', e);
      }
    }

    // Load recipe metadata (if exists)
    const metadata = getRecipeMetadata(recipeData.dish_name);

    // Set form data
    setNewRecipe({
      dishName: recipeData.dish_name,
      rawWeight: metadata?.rawWeight?.toString() || '5',
      cookedWeight: metadata?.cookedWeight?.toString() || '4.5',
      containerSize: metadata?.containerSize || '500ml',
      customContainerSize: '',
      portionsPerKg: metadata?.portionsPerKg?.toString() || '6',
      portionSize: metadata?.portionSize?.toString() || '166',
      totalPortions: metadata?.totalPortions?.toString() || '',
      category: recipeData.category || 'Main Course',
      ingredients: ingredients,
      notes: metadata?.notes || ''
    });

    setEditingRecipe(recipeData.id);
    setShowAddRecipe(true);
  };

  // Add ingredient to recipe
  const addIngredientToRecipe = () => {
    if (newIngredient.name && newIngredient.quantity) {
      const existingItem = inventory && inventory.length > 0
        ? inventory.find(item =>
            item.name && item.name.toLowerCase() === newIngredient.name.toLowerCase()
          )
        : null;

      if (!existingItem && newIngredient.isNewToInventory) {
        const newInventoryItem = {
          id: inventory && inventory.length > 0 ? Math.max(...inventory.map(i => i.id || 0)) + 1 : 1,
          name: newIngredient.name,
          unit: newIngredient.unit,
          openingStock: 0,
          receivedThisWeek: 0,
          reorderLevel: parseFloat(newIngredient.reorderLevel) || 1,
          unitCost: parseFloat(newIngredient.unitCost) || 0,
          supplier: newIngredient.supplier,
          category: newIngredient.category
        };
        setInventory(prev => [...(prev || []), newInventoryItem]);
      }

      const ingredient = {
        id: Date.now(),
        ingredient: newIngredient.name,
        quantityPer1kg: parseFloat(newIngredient.quantity),
        unit: newIngredient.unit,
        cost: existingItem ? (existingItem.unitCost || 0) * parseFloat(newIngredient.quantity) :
              parseFloat(newIngredient.unitCost || 0) * parseFloat(newIngredient.quantity) || 0
      };

      setNewRecipe(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, ingredient]
      }));

      setNewIngredient({
        name: '',
        quantity: '',
        unit: 'kg',
        isNewToInventory: false,
        category: 'Dry Items',
        supplier: 'Local Supplier',
        unitCost: '',
        reorderLevel: ''
      });
      setShowIngredientDropdown(false);
      setFilteredInventory([]);
    }
  };

  // Remove ingredient from recipe
  const removeIngredientFromRecipe = (ingredientId) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId)
    }));
  };

  // Save recipe to database
  const saveRecipe = async () => {
    if (newRecipe.dishName && newRecipe.cookedWeight && newRecipe.containerSize && newRecipe.ingredients.length > 0) {

      // Format ingredients for database
      const ingredientsForDB = newRecipe.ingredients.map(ing => ({
        item: ing.ingredient,
        quantity: ing.quantityPer1kg,
        unit: ing.unit
      }));

      // Calculate total cost
      const totalCost = newRecipe.ingredients.reduce((sum, ing) => sum + (ing.cost || 0), 0);

      try {
        if (editingRecipe) {
          // Update existing recipe
          const { error } = await supabase
            .from('recipe_bank')
            .update({
              dish_name: newRecipe.dishName,
              ingredients: JSON.stringify(ingredientsForDB),
              cost_per_kg: totalCost,
              category: newRecipe.category,
              preparation_time: parseInt(newRecipe.preparationTime) || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', editingRecipe);

          if (error) throw error;
        } else {
          // Insert new recipe
          const { error } = await supabase
            .from('recipe_bank')
            .insert({
              dish_name: newRecipe.dishName,
              ingredients: JSON.stringify(ingredientsForDB),
              cost_per_kg: totalCost,
              category: newRecipe.category,
              preparation_time: parseInt(newRecipe.preparationTime) || null
            });

          if (error) throw error;
        }

        // Save metadata to localStorage
        const recipeMetadata = {
          dishName: newRecipe.dishName,
          rawWeight: parseFloat(newRecipe.rawWeight) || 0,
          cookedWeight: parseFloat(newRecipe.cookedWeight) || 0,
          yield: calculateYield(newRecipe.rawWeight, newRecipe.cookedWeight),
          containerSize: newRecipe.containerSize === 'Other' ? newRecipe.customContainerSize : newRecipe.containerSize,
          portionsPerKg: parseFloat(newRecipe.portionsPerKg) || 8,
          portionSize: parseFloat(newRecipe.portionSize) || 125,
          totalPortions: parseFloat(newRecipe.totalPortions) || 0,
          category: newRecipe.category,
          notes: newRecipe.notes
        };

        const existingMetadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
        existingMetadata[newRecipe.dishName] = recipeMetadata;
        localStorage.setItem('recipeMetadata', JSON.stringify(existingMetadata));

        // Reload recipes
        const { data, error } = await supabase
          .from('recipe_bank')
          .select('*')
          .order('dish_name');

        if (!error && data) {
          setRecipeBank(data);
        }

        // Reset form
        setNewRecipe({
          dishName: '',
          rawWeight: '',
          cookedWeight: '',
          containerSize: '500ml',
          customContainerSize: '',
          portionsPerKg: '',
          portionSize: '',
          totalPortions: '',
          category: 'Main Course',
          ingredients: [],
          notes: ''
        });
        setNewIngredient({
          name: '',
          quantity: '',
          unit: 'kg',
          isNewToInventory: false,
          category: 'Dry Items',
          supplier: 'Local Supplier',
          unitCost: '',
          reorderLevel: ''
        });
        setShowAddRecipe(false);
        setEditingRecipe(null);
        setShowIngredientDropdown(false);
        setFilteredInventory([]);

        alert(`✅ Recipe "${recipeMetadata.dishName}" ${editingRecipe ? 'updated' : 'added'} successfully!`);
      } catch (error) {
        console.error('Error saving recipe:', error);
        alert('❌ Error saving recipe: ' + error.message);
      }
    } else {
      alert('❌ Please fill in all required fields and add at least one ingredient');
    }
  };

  // Delete recipe from database
  const deleteRecipe = async (recipeId, dishName) => {
    if (userRole !== 'owner') {
      alert('⛔ Only owners can delete recipes');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the recipe for "${dishName}"? This cannot be undone.`)) {
      try {
        const { error } = await supabase
          .from('recipe_bank')
          .delete()
          .eq('id', recipeId);

        if (error) throw error;

        // Remove from local state
        setRecipeBank(prev => prev.filter(r => r.id !== recipeId));

        // Remove metadata
        const metadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
        delete metadata[dishName];
        localStorage.setItem('recipeMetadata', JSON.stringify(metadata));

        alert(`✅ Recipe "${dishName}" deleted successfully`);
      } catch (error) {
        console.error('Error deleting recipe:', error);
        alert('❌ Error deleting recipe: ' + error.message);
      }
    }
  };

  // Load recipe metadata
  const getRecipeMetadata = (dishName) => {
    try {
      const metadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
      return metadata[dishName] || null;
    } catch (error) {
      console.error('Error loading recipe metadata:', error);
      return null;
    }
  };

  // Calculate recipe cost from database format
  const calculateRecipeCostFromDB = (recipe) => {
    if (!recipe.ingredients || recipe.ingredients === '[]') return 0;

    try {
      const ingredients = safeParseIngredients(recipe.ingredients);

      let totalCost = 0;

      ingredients.forEach(ing => {
        if (inventory && inventory.length > 0) {
          const inventoryItem = inventory.find(i => i.name === ing.item);
          if (inventoryItem) {
            totalCost += (ing.quantity || 0) * (inventoryItem.unitCost || 0);
          }
        }
      });

      return totalCost;
    } catch (error) {
      console.error('Error calculating cost:', error);
      return recipe.cost_per_kg || 0;
    }
  };

  // Cancel edit/add
  const cancelEdit = () => {
    setShowAddRecipe(false);
    setEditingRecipe(null);
    setNewRecipe({
      dishName: '',
      rawWeight: '',
      cookedWeight: '',
      containerSize: '500ml',
      customContainerSize: '',
      portionsPerKg: '',
      portionSize: '',
      totalPortions: '',
      category: 'Main Course',
      ingredients: [],
      notes: ''
    });
    setNewIngredient({
      name: '',
      quantity: '',
      unit: 'kg',
      isNewToInventory: false,
      category: 'Dry Items',
      supplier: 'Local Supplier',
      unitCost: '',
      reorderLevel: ''
    });
    setShowIngredientDropdown(false);
    setFilteredInventory([]);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <ChefHat className="mr-2" /> Enhanced Recipe Bank
      </h2>

      {/* Add Recipe Button */}
      {!showAddRecipe && (
        <div className="mb-6">
          <button
            onClick={() => {
              setEditingRecipe(null);
              setShowAddRecipe(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <Plus className="mr-2" size={20} />
            Add New Recipe
          </button>
        </div>
      )}

      {/* Add/Edit Recipe Form */}
      {showAddRecipe && (
        <div className="bg-white border-2 border-green-500 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-green-700">
            {editingRecipe ? `Edit Recipe: ${newRecipe.dishName}` : 'Create New Recipe'}
          </h3>

          {/* Basic Recipe Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Dish Name *</label>
              <input
                type="text"
                value={newRecipe.dishName}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, dishName: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                placeholder="e.g. Chicken Biryani"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={newRecipe.category}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, category: e.target.value }))}
                className="w-full p-2 border rounded-lg"
              >
                <option value="Biryani">Biryani</option>
                <option value="Curry">Curry</option>
                <option value="Starter">Starter</option>
                <option value="Dessert">Dessert</option>
                <option value="Chutney">Chutney</option>
                <option value="Rice">Rice</option>
                <option value="Pulav">Pulav</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Snack">Snack</option>
                <option value="Bread">Bread</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Raw Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                value={newRecipe.rawWeight}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, rawWeight: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                placeholder="5.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cooked Weight (kg) *</label>
              <input
                type="number"
                step="0.1"
                value={newRecipe.cookedWeight}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, cookedWeight: e.target.value }))}
                className="w-full p-2 border rounded-lg"
                placeholder="4.5"
              />
              {newRecipe.rawWeight && newRecipe.cookedWeight && (
                <div className="text-xs text-green-600 mt-1">
                  Yield: {calculateYield(newRecipe.rawWeight, newRecipe.cookedWeight)}%
                </div>
              )}
            </div>
          </div>

          {/* Portion Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium mb-1">Container Size *</label>
              <select
                value={newRecipe.containerSize}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, containerSize: e.target.value }))}
                className="w-full p-2 border rounded-lg bg-white"
              >
                {containerSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Total Portions *</label>
              <input
                type="number"
                value={newRecipe.totalPortions}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, totalPortions: e.target.value }))}
                className="w-full p-2 border rounded-lg bg-white"
                placeholder="27"
                title="Enter the total number of portions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Portion Size (g) *</label>
              <input
                type="number"
                value={newRecipe.portionSize}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, portionSize: e.target.value }))}
                className="w-full p-2 border rounded-lg bg-white"
                placeholder="167"
                title="Enter portion size in grams"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Portions per kg</label>
              <input
                type="number"
                step="0.1"
                value={newRecipe.portionsPerKg}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, portionsPerKg: e.target.value }))}
                className="w-full p-2 border rounded-lg bg-white"
                placeholder="6.0"
                title="Auto-calculated or enter manually"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cost/Portion</label>
              <div className="p-2 border rounded-lg bg-gray-100">
                £{newRecipe.ingredients.length > 0 && newRecipe.portionsPerKg
                  ? (newRecipe.ingredients.reduce((sum, ing) => sum + (ing.cost || 0), 0) / parseFloat(newRecipe.portionsPerKg || 1)).toFixed(2)
                  : '0.00'}
              </div>
            </div>
          </div>

          {/* Add Ingredients Section */}
          <div className="mb-6">
            <h4 className="font-semibold mb-3 text-gray-700">Add Ingredients</h4>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="relative">
                <label className="text-xs font-medium">Ingredient Name *</label>
                <input
                  type="text"
                  value={newIngredient.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const exists = inventory && inventory.length > 0
                      ? inventory.some(item =>
                          item.name && item.name.toLowerCase() === name.toLowerCase()
                        )
                      : false;
                    setNewIngredient(prev => ({
                      ...prev,
                      name,
                      isNewToInventory: !exists
                    }));
                  }}
                  onFocus={() => {
                    if (inventory && inventory.length > 0) {
                      setFilteredInventory(inventory);
                      setShowIngredientDropdown(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay to allow click on dropdown items
                    setTimeout(() => setShowIngredientDropdown(false), 200);
                  }}
                  className="w-full p-2 border rounded"
                  placeholder="Search or add ingredient"
                  autoComplete="off"
                />

                {/* Dropdown for inventory items */}
                {showIngredientDropdown && filteredInventory.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredInventory.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setNewIngredient(prev => ({
                            ...prev,
                            name: item.name,
                            unit: item.unit || 'kg',
                            isNewToInventory: false
                          }));
                          setShowIngredientDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 flex justify-between items-center"
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-gray-500">
                          {item.unit} • £{item.unitCost?.toFixed(2)}/{item.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {newIngredient.name && inventory && inventory.length > 0 && !inventory.some(i =>
                  i.name && i.name.toLowerCase() === newIngredient.name.toLowerCase()
                ) && (
                  <div className="text-xs text-orange-600 mt-1">
                    ⚠️ New item - will be added to inventory
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium">Quantity (per kg) *</label>
                <input
                  type="number"
                  step="0.001"
                  value={newIngredient.quantity}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full p-2 border rounded"
                  placeholder="0.5"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Unit</label>
                <select
                  value={newIngredient.unit}
                  onChange={(e) => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="pieces">pieces</option>
                  <option value="bunch">bunch</option>
                  <option value="box">box</option>
                </select>
              </div>

              {newIngredient.isNewToInventory && (
                <>
                  <div>
                    <label className="text-xs font-medium">Unit Cost (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newIngredient.unitCost}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, unitCost: e.target.value }))}
                      className="w-full p-2 border rounded"
                      placeholder="5.50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium">Supplier</label>
                    <input
                      type="text"
                      value={newIngredient.supplier}
                      onChange={(e) => setNewIngredient(prev => ({ ...prev, supplier: e.target.value }))}
                      className="w-full p-2 border rounded"
                      placeholder="Local Supplier"
                    />
                  </div>
                </>
              )}

              <div className="flex items-end">
                <button
                  onClick={addIngredientToRecipe}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  <Plus size={16} className="inline" />
                  Add
                </button>
              </div>
            </div>

            {/* Ingredients List */}
            {newRecipe.ingredients && newRecipe.ingredients.length > 0 && (
              <div className="mt-4">
                <h5 className="font-medium mb-2">Recipe Ingredients:</h5>
                <div className="space-y-2">
                  {newRecipe.ingredients.map(ing => (
                    <div key={ing.id} className="flex justify-between items-center p-2 bg-white border rounded">
                      <span>
                        {ing.ingredient} - {ing.quantityPer1kg} {ing.unit}
                        {ing.cost > 0 && (
                          <span className="text-green-600 ml-2">
                            (£{ing.cost.toFixed(3)})
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => removeIngredientFromRecipe(ing.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="p-2 bg-green-50 rounded font-medium">
                    Total Cost per kg: £
                    {newRecipe.ingredients.reduce((sum, ing) => sum + (ing.cost || 0), 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Recipe Notes</label>
            <textarea
              value={newRecipe.notes}
              onChange={(e) => setNewRecipe(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-2 border rounded-lg"
              rows="3"
              placeholder="Special instructions, cooking tips, etc."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={saveRecipe}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <Save className="mr-2" size={16} />
              {editingRecipe ? 'Update Recipe' : 'Save Recipe'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Display Recipes */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recipes...</p>
        </div>
      ) : recipeBank.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat size={64} className="mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium text-gray-600 mb-2">No Recipes Yet</h3>
          <p className="text-gray-500 mb-4">Start by adding your first recipe to the system</p>
          <button
            onClick={() => setShowAddRecipe(true)}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Add First Recipe
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipeBank.map(recipe => {
            const ingredients = safeParseIngredients(recipe.ingredients);
            const totalCost = calculateRecipeCostFromDB(recipe);
            const metadata = getRecipeMetadata(recipe.dish_name);

            return (
              <div key={recipe.id} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                {/* Recipe Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold">{recipe.dish_name}</h3>
                      <div className="text-sm opacity-90 mt-1">
                        {recipe.category} | Prep time: {recipe.preparation_time || 'N/A'} mins
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditingRecipe(recipe)}
                        className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                        title="Edit Recipe"
                      >
                        <Edit size={18} />
                      </button>
                      {userRole === 'owner' && (
                        <button
                          onClick={() => deleteRecipe(recipe.id, recipe.dish_name)}
                          className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                          title="Delete Recipe"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Recipe Metadata */}
                {metadata && (
                  <div className="p-4 bg-gray-50 border-b">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Raw Weight:</span>
                        <span className="font-medium ml-2">{metadata.rawWeight}kg</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Cooked Weight:</span>
                        <span className="font-medium ml-2">{metadata.cookedWeight}kg</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Yield:</span>
                        <span className="font-medium ml-2 text-green-600">{metadata.yield}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Portions:</span>
                        <span className="font-medium ml-2">{metadata.totalPortions || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Portion Size:</span>
                        <span className="font-medium ml-2">{metadata.portionSize}g</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Container:</span>
                        <span className="font-medium ml-2">{metadata.containerSize}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ingredients List */}
                <div className="p-4">
                  <h4 className="font-semibold mb-3 text-gray-700">Ingredients:</h4>
                  {ingredients.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {ingredients.map((ing, index) => {
                        const inventoryItem = inventory && inventory.length > 0
                          ? inventory.find(i => i.name === ing.item)
                          : null;
                        const itemCost = inventoryItem
                          ? (ing.quantity || 0) * (inventoryItem.unitCost || 0)
                          : 0;

                        return (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="flex items-center">
                              {!inventoryItem && (
                                <AlertTriangle size={14} className="text-orange-500 mr-1" title="Not in inventory" />
                              )}
                              {ing.item}
                            </span>
                            <span className="text-gray-600">
                              {ing.quantity} {ing.unit}
                              {inventoryItem && (
                                <span className="text-green-600 ml-2">
                                  £{itemCost.toFixed(3)}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No ingredients added yet</p>
                  )}
                </div>

                {/* Cost Summary */}
                <div className="p-4 bg-green-50 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">Total Cost per kg</div>
                      <div className="text-xl font-bold text-green-600">
                        £{totalCost.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Cost per portion</div>
                      <div className="text-lg font-semibold text-green-600">
                        £{metadata && metadata.portionsPerKg > 0
                          ? (totalCost / metadata.portionsPerKg).toFixed(2)
                          : (totalCost * 0.16).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {metadata?.notes && (
                  <div className="p-3 bg-yellow-50 border-t text-sm">
                    <strong>Notes:</strong> {metadata.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnhancedRecipeBank;
