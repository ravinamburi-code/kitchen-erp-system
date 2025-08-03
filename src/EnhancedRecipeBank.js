// EnhancedRecipeBank.js - FIXED VERSION
import React, { useState, useEffect } from 'react';
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
  const [autoCalculatePortions, setAutoCalculatePortions] = useState(true);

  // New recipe form state
  const [newRecipe, setNewRecipe] = useState({
    dishName: '',
    rawWeight: '',
    cookedWeight: '',
    containerSize: '500ml',
    customContainerSize: '',
    portionsPerKg: '',
    portionSize: '',
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

  // Calculate yield percentage
  const calculateYield = (raw, cooked) => {
    if (raw && cooked && parseFloat(raw) > 0) {
      return ((parseFloat(cooked) / parseFloat(raw)) * 100).toFixed(1);
    }
    return 0;
  };

  // Calculate portions based on cooked weight and portion size
  const calculatePortions = () => {
    if (newRecipe.cookedWeight && newRecipe.portionSize && autoCalculatePortions) {
      const cookedGrams = parseFloat(newRecipe.cookedWeight) * 1000;
      const portionSizeGrams = parseFloat(newRecipe.portionSize);

      if (portionSizeGrams > 0) {
        const portions = Math.floor(cookedGrams / portionSizeGrams);
        const portionsPerKg = portions / parseFloat(newRecipe.cookedWeight);

        setNewRecipe(prev => ({
          ...prev,
          portionsPerKg: portionsPerKg.toFixed(1)
        }));
      }
    }
  };

  // Load recipe for editing
  const startEditingRecipe = (dishName) => {
    console.log('Starting to edit recipe:', dishName);

    const dishRecipes = recipes.filter(r => r.dishName === dishName);
    console.log('Found ingredients:', dishRecipes.length);

    const metadata = getRecipeMetadata(dishName);
    console.log('Existing metadata:', metadata);

    // If no metadata exists, create default metadata from existing recipe
    const recipeData = metadata || {
      dishName: dishName,
      rawWeight: 5,  // Default values
      cookedWeight: 4.5,
      containerSize: '500ml',
      portionsPerKg: 6,
      portionSize: 166,
      category: 'Main Course',
      notes: 'Edit this recipe to add proper details'
    };

    // Load recipe data into the form
    setNewRecipe({
      dishName: recipeData.dishName,
      rawWeight: recipeData.rawWeight?.toString() || '5',
      cookedWeight: recipeData.cookedWeight?.toString() || '4.5',
      containerSize: recipeData.containerSize || '500ml',
      customContainerSize: '',
      portionsPerKg: recipeData.portionsPerKg?.toString() || '6',
      portionSize: recipeData.portionSize?.toString() || '166',
      category: recipeData.category || 'Main Course',
      ingredients: dishRecipes.map((r, index) => ({
        id: Date.now() + index, // Unique ID for each ingredient
        ingredient: r.ingredient,
        quantityPer1kg: r.quantityPer1kg,
        unit: r.unit,
        cost: 0
      })),
      notes: recipeData.notes || ''
    });

    console.log('Form data set, opening form...');
    setEditingRecipe(dishName);
    setShowAddRecipe(true);
    setAutoCalculatePortions(false); // Don't auto-calculate when editing
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
    }
  };

  // Remove ingredient from recipe
  const removeIngredientFromRecipe = (ingredientId) => {
    setNewRecipe(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(ing => ing.id !== ingredientId)
    }));
  };

  // Save new or updated recipe
  const saveRecipe = () => {
    if (newRecipe.dishName && newRecipe.cookedWeight && newRecipe.containerSize && newRecipe.ingredients.length > 0) {

      // If editing, remove old recipes first
      if (editingRecipe) {
        setRecipes(prev => (prev || []).filter(r => r.dishName !== editingRecipe));
      }

      // Create recipe entries
      const recipeEntries = newRecipe.ingredients.map((ing, index) => ({
        id: recipes && recipes.length > 0 ? Math.max(...recipes.map(r => r.id || 0)) + index + 1 : index + 1,
        dishName: newRecipe.dishName,
        ingredient: ing.ingredient,
        quantityPer1kg: ing.quantityPer1kg,
        unit: ing.unit
      }));

      // Create/Update recipe metadata
      const recipeMetadata = {
        dishName: newRecipe.dishName,
        rawWeight: parseFloat(newRecipe.rawWeight) || 0,
        cookedWeight: parseFloat(newRecipe.cookedWeight) || 0,
        yield: calculateYield(newRecipe.rawWeight, newRecipe.cookedWeight),
        containerSize: newRecipe.containerSize === 'Other' ? newRecipe.customContainerSize : newRecipe.containerSize,
        portionsPerKg: parseFloat(newRecipe.portionsPerKg) || 8,
        portionSize: parseFloat(newRecipe.portionSize) || 125,
        category: newRecipe.category,
        notes: newRecipe.notes
      };

      // Store metadata in localStorage
      try {
        const existingMetadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
        // If editing and dish name changed, remove old metadata
        if (editingRecipe && editingRecipe !== newRecipe.dishName) {
          delete existingMetadata[editingRecipe];
        }
        existingMetadata[newRecipe.dishName] = recipeMetadata;
        localStorage.setItem('recipeMetadata', JSON.stringify(existingMetadata));
      } catch (error) {
        console.error('Error saving recipe metadata:', error);
      }

      // Add recipe entries to recipes array
      setRecipes(prev => [...(prev || []), ...recipeEntries]);

      // Reset form
      setNewRecipe({
        dishName: '',
        rawWeight: '',
        cookedWeight: '',
        containerSize: '500ml',
        customContainerSize: '',
        portionsPerKg: '',
        portionSize: '',
        category: 'Main Course',
        ingredients: [],
        notes: ''
      });
      setShowAddRecipe(false);
      setEditingRecipe(null);
      setAutoCalculatePortions(true);

      alert(`✅ Recipe "${recipeMetadata.dishName}" ${editingRecipe ? 'updated' : 'added'} successfully!`);
    } else {
      alert('❌ Please fill in all required fields and add at least one ingredient');
    }
  };

  // Delete recipe (Owner only)
  const deleteRecipe = (dishName) => {
    if (userRole !== 'owner') {
      alert('⛔ Only owners can delete recipes');
      return;
    }

    if (window.confirm(`Are you sure you want to delete the recipe for "${dishName}"? This cannot be undone.`)) {
      setRecipes(prev => (prev || []).filter(r => r.dishName !== dishName));

      try {
        const metadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
        delete metadata[dishName];
        localStorage.setItem('recipeMetadata', JSON.stringify(metadata));
      } catch (error) {
        console.error('Error deleting recipe metadata:', error);
      }

      alert(`✅ Recipe "${dishName}" deleted successfully`);
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

  // Calculate total recipe cost
  const calculateRecipeCost = (dishName) => {
    if (!recipes || recipes.length === 0) return 0;

    const dishRecipes = recipes.filter(r => r.dishName === dishName);
    let totalCost = 0;

    dishRecipes.forEach(recipe => {
      if (inventory && inventory.length > 0) {
        const inventoryItem = inventory.find(i => i.name === recipe.ingredient);
        if (inventoryItem) {
          totalCost += (recipe.quantityPer1kg || 0) * (inventoryItem.unitCost || 0);
        }
      }
    });

    return totalCost;
  };

  // Get unique dish names
  const getUniqueDishes = () => {
    if (!recipes || recipes.length === 0) return [];
    return [...new Set(recipes.map(r => r.dishName))];
  };

  // Cancel edit/add
  const cancelEdit = () => {
    setShowAddRecipe(false);
    setEditingRecipe(null);
    setAutoCalculatePortions(true);
    setNewRecipe({
      dishName: '',
      rawWeight: '',
      cookedWeight: '',
      containerSize: '500ml',
      customContainerSize: '',
      portionsPerKg: '',
      portionSize: '',
      category: 'Main Course',
      ingredients: [],
      notes: ''
    });
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <ChefHat className="mr-2" /> Enhanced Recipe Bank
      </h2>

      {/* Add Recipe Button and Migration */}
      {!showAddRecipe && (
        <div className="mb-6 flex space-x-3">
          <button
            onClick={() => {
              setEditingRecipe(null);
              setShowAddRecipe(true);
              setAutoCalculatePortions(true);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <Plus className="mr-2" size={20} />
            Add New Recipe
          </button>

          {/* Migration button for existing recipes without metadata */}
          {getUniqueDishes().length > 0 && (
            <button
              onClick={() => {
                const existingMetadata = JSON.parse(localStorage.getItem('recipeMetadata') || '{}');
                let migrated = 0;

                getUniqueDishes().forEach(dishName => {
                  if (!existingMetadata[dishName]) {
                    // Create default metadata for recipes without it
                    existingMetadata[dishName] = {
                      dishName: dishName,
                      rawWeight: 5,
                      cookedWeight: 4.5,
                      yield: 90,
                      containerSize: dishName.includes('Biryani') || dishName.includes('Pulav') ? '650ml' : '500ml',
                      portionsPerKg: dishName.includes('Curry') ? 10 : dishName.includes('Pakora') ? 12 : 6,
                      portionSize: dishName.includes('Curry') ? 100 : dishName.includes('Pakora') ? 83 : 166,
                      category: dishName.includes('Pakora') ? 'Starter' : dishName.includes('Salan') ? 'Side Dish' : 'Main Course',
                      notes: 'Migrated from existing recipe'
                    };
                    migrated++;
                  }
                });

                if (migrated > 0) {
                  localStorage.setItem('recipeMetadata', JSON.stringify(existingMetadata));
                  alert(`✅ Migrated ${migrated} recipes! You can now edit them.`);
                  window.location.reload(); // Refresh to show the metadata
                } else {
                  alert('All recipes already have metadata!');
                }
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Calculator className="mr-2" size={20} />
              Fix Existing Recipes
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Recipe Form */}
      {showAddRecipe && (
        <div className="bg-white border-2 border-green-500 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-green-700">
            {editingRecipe ? `Edit Recipe: ${editingRecipe}` : 'Create New Recipe'}
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
                <option value="Main Course">Main Course</option>
                <option value="Starter">Starter</option>
                <option value="Side Dish">Side Dish</option>
                <option value="Dessert">Dessert</option>
                <option value="Beverage">Beverage</option>
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
                onChange={(e) => {
                  setNewRecipe(prev => ({ ...prev, cookedWeight: e.target.value }));
                  calculatePortions();
                }}
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
              {newRecipe.containerSize === 'Other' && (
                <input
                  type="text"
                  value={newRecipe.customContainerSize}
                  onChange={(e) => setNewRecipe(prev => ({ ...prev, customContainerSize: e.target.value }))}
                  className="w-full p-2 border rounded-lg mt-2"
                  placeholder="Enter custom size"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Portion Size (g) *</label>
              <input
                type="number"
                value={newRecipe.portionSize}
                onChange={(e) => {
                  setNewRecipe(prev => ({ ...prev, portionSize: e.target.value }));
                  calculatePortions();
                }}
                className="w-full p-2 border rounded-lg bg-white"
                placeholder="160"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Portions per kg
                <input
                  type="checkbox"
                  checked={autoCalculatePortions}
                  onChange={(e) => setAutoCalculatePortions(e.target.checked)}
                  className="ml-2"
                  title="Auto-calculate"
                />
                <span className="text-xs ml-1">Auto</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={newRecipe.portionsPerKg}
                onChange={(e) => setNewRecipe(prev => ({ ...prev, portionsPerKg: e.target.value }))}
                className={`w-full p-2 border rounded-lg ${autoCalculatePortions ? 'bg-gray-100' : 'bg-white'}`}
                placeholder={autoCalculatePortions ? "Auto-calculated" : "Enter manually"}
                readOnly={autoCalculatePortions}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Total Portions</label>
              <div className="p-2 border rounded-lg bg-gray-100">
                {newRecipe.cookedWeight && newRecipe.portionsPerKg
                  ? Math.floor(parseFloat(newRecipe.cookedWeight) * parseFloat(newRecipe.portionsPerKg))
                  : '-'}
              </div>
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
              <div>
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
                  className="w-full p-2 border rounded"
                  placeholder="e.g. Chicken"
                />
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

      {/* Existing Recipes Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {getUniqueDishes().map(dishName => {
          const dishRecipes = recipes.filter(r => r.dishName === dishName);
          const metadata = getRecipeMetadata(dishName);
          const totalCost = calculateRecipeCost(dishName);

          return (
            <div key={dishName} className="bg-white border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              {/* Recipe Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{dishName}</h3>
                    {metadata && (
                      <div className="text-sm opacity-90 mt-1">
                        {metadata.category} | {metadata.containerSize} containers
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEditingRecipe(dishName)}
                      className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                      title="Edit Recipe"
                    >
                      <Edit size={18} />
                    </button>
                    {userRole === 'owner' && (
                      <button
                        onClick={() => deleteRecipe(dishName)}
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
                      <span className="text-gray-600">Portions/kg:</span>
                      <span className="font-medium ml-2">{metadata.portionsPerKg}</span>
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
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dishRecipes.map(recipe => {
                    const inventoryItem = inventory && inventory.length > 0
                      ? inventory.find(i => i.name === recipe.ingredient)
                      : null;
                    const itemCost = inventoryItem
                      ? (recipe.quantityPer1kg || 0) * (inventoryItem.unitCost || 0)
                      : 0;

                    return (
                      <div key={recipe.id} className="flex justify-between items-center text-sm">
                        <span className="flex items-center">
                          {!inventoryItem && (
                            <AlertTriangle size={14} className="text-orange-500 mr-1" title="Not in inventory" />
                          )}
                          {recipe.ingredient}
                        </span>
                        <span className="text-gray-600">
                          {recipe.quantityPer1kg} {recipe.unit}
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
              </div>

              {/* Cost Summary */}
              <div className="p-4 bg-green-50 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-600">Total Cost per kg</div>
                    <div className="text-xl font-bold text-green-600">£{totalCost.toFixed(2)}</div>
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

      {/* No Recipes Message */}
      {(!recipes || recipes.length === 0) && !showAddRecipe && (
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
      )}
    </div>
  );
};

export default EnhancedRecipeBank;
