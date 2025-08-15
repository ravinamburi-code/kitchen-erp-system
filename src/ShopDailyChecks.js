// ShopDailyChecks.js
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import {
  CheckSquare, Thermometer, Clock, User, AlertTriangle,
  CheckCircle, XCircle, Save, Calendar, FileText,
  RefreshCw, Plus, Edit2, Trash2, AlertCircle,
  Store, Lock, Unlock, MapPin, Sun, Moon,
  Coffee, ChevronUp, ChevronDown, X, Edit3
} from 'lucide-react';

const ShopDailyChecks = ({
  currentUser = null,
  initialLocation = 'Eastham'
}) => {
  // State Management
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [activeTab, setActiveTab] = useState('opening');
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editText, setEditText] = useState('');

  // Shop Status Management (shared with Sales Tracker)
  const [shopStatus, setShopStatus] = useState(() => {
    const saved = localStorage.getItem('shopStatus');
    return saved ? JSON.parse(saved) : {
      'Eastham': { isOpen: false, openTime: null, closeTime: null },
      'Bethnal Green': { isOpen: false, openTime: null, closeTime: null }
    };
  });

  const currentShopStatus = shopStatus[selectedLocation];

  // Checklist States - Now includes mid-shift
  const [openingChecklist, setOpeningChecklist] = useState([]);
  const [midShiftChecklist, setMidShiftChecklist] = useState([]);
  const [closingChecklist, setClosingChecklist] = useState([]);
  const [openingProgress, setOpeningProgress] = useState({});
  const [midShiftProgress, setMidShiftProgress] = useState({});
  const [closingProgress, setClosingProgress] = useState({});
  const [checklistNotes, setChecklistNotes] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemType, setNewItemType] = useState('opening');
  const [newItemCategory, setNewItemCategory] = useState('');

  // Temperature States
  const [fridgeUnits, setFridgeUnits] = useState([]);
  const [temperatureReadings, setTemperatureReadings] = useState({});
  const [tempNotes, setTempNotes] = useState({});
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({
    name: '',
    type: 'fridge',
    minTemp: 1,
    maxTemp: 4
  });

  // Daily Summary States
  const [dailySummary, setDailySummary] = useState({
    startStock: '',
    endStock: '',
    wasteQty: '',
    reorderPlaced: false,
    notes: ''
  });

  // Completion tracking - Location specific
  const [todaysCompletions, setTodaysCompletions] = useState({
    'Eastham': {
      opening: null,
      midshift: null,
      closing: null,
      temperatures: []
    },
    'Bethnal Green': {
      opening: null,
      midshift: null,
      closing: null,
      temperatures: []
    }
  });

  // Get current location's completions
  const currentCompletions = todaysCompletions[selectedLocation] || {
    opening: null,
    midshift: null,
    closing: null,
    temperatures: []
  };

  // History States
  const [recentHistory, setRecentHistory] = useState([]);

  // Default opening checklist based on PDF
  const setDefaultOpeningChecklist = () => {
    const defaultOpening = [
      // Stock & Spoilage
      { id: 1, item_text: 'Count all key items (rice types, curries, snacks, proteins) – record portion counts', category: 'STOCK & SPOILAGE', sort_order: 1 },
      { id: 2, item_text: 'Mark any item with less than X portions – place reorder before cut-off', category: 'STOCK & SPOILAGE', sort_order: 2 },
      { id: 3, item_text: 'Remove & record any spoiled/expired/damaged food before opening', category: 'STOCK & SPOILAGE', sort_order: 3 },
      { id: 4, item_text: 'Apply FIFO (First In, First Out) for all stock', category: 'STOCK & SPOILAGE', sort_order: 4 },
      { id: 5, item_text: 'Fridges, freezers, and chillers checked for correct temperature', category: 'STOCK & SPOILAGE', sort_order: 5 },
      // Cleaning & Hygiene
      { id: 6, item_text: 'Clean & disinfect all cooking stations, scales, and prep tables', category: 'CLEANING & HYGIENE', sort_order: 6 },
      { id: 7, item_text: 'Floors swept, mopped, and kept dry/tidy', category: 'CLEANING & HYGIENE', sort_order: 7 },
      { id: 8, item_text: 'All raw materials, spices, and packaging off the floor & stored correctly', category: 'CLEANING & HYGIENE', sort_order: 8 },
      { id: 9, item_text: 'Chef uniforms, aprons, caps/hairnets clean and worn', category: 'CLEANING & HYGIENE', sort_order: 9 },
      { id: 10, item_text: 'All cooking equipment clean, safe, and ready for use', category: 'CLEANING & HYGIENE', sort_order: 10 }
    ];
    setOpeningChecklist(defaultOpening);
    const prog = {};
    defaultOpening.forEach(item => prog[item.id] = false);
    setOpeningProgress(prog);
  };

  // Default mid-shift checklist based on PDF
  const setDefaultMidShiftChecklist = () => {
    const defaultMidShift = [
      { id: 1, item_text: 'Recount high-demand items', category: 'MID-SHIFT', sort_order: 1 },
      { id: 2, item_text: 'If stock is below reorder point – place order before cut-off (12pm same day / 4pm next day)', category: 'MID-SHIFT', sort_order: 2 },
      { id: 3, item_text: 'Remove any food that looks spoiled/unsafe and log reason', category: 'MID-SHIFT', sort_order: 3 },
      { id: 4, item_text: 'Double check delivery apps (Uber/Deliveroo) tablets are working', category: 'MID-SHIFT', sort_order: 4 },
      { id: 5, item_text: 'Clean and disinfect high-use work surfaces, knives, and boards', category: 'MID-SHIFT', sort_order: 5 }
    ];
    setMidShiftChecklist(defaultMidShift);
    const prog = {};
    defaultMidShift.forEach(item => prog[item.id] = false);
    setMidShiftProgress(prog);
  };

  // Default closing checklist based on PDF
  const setDefaultClosingChecklist = () => {
    const defaultClosing = [
      // Stock & Waste
      { id: 1, item_text: 'Count leftover portions of each product', category: 'STOCK & WASTE', sort_order: 1 },
      { id: 2, item_text: 'Mark items to be used first next day (FIFO priority)', category: 'STOCK & WASTE', sort_order: 2 },
      { id: 3, item_text: 'Discard expired/spoiled items – record waste quantity', category: 'STOCK & WASTE', sort_order: 3 },
      // Cleaning & Shutdown
      { id: 4, item_text: 'Switch off and unplug all unused equipment', category: 'CLEANING & SHUTDOWN', sort_order: 4 },
      { id: 5, item_text: 'Clean and disinfect all surfaces, floors, and splash areas', category: 'CLEANING & SHUTDOWN', sort_order: 5 },
      { id: 6, item_text: 'Empty & disinfect all bins – replace liners', category: 'CLEANING & SHUTDOWN', sort_order: 6 },
      { id: 7, item_text: 'Clean/store all towels, mops, and cleaning tools', category: 'CLEANING & SHUTDOWN', sort_order: 7 },
      { id: 8, item_text: 'Cover & label all stored food with date/time', category: 'CLEANING & SHUTDOWN', sort_order: 8 },
      { id: 9, item_text: 'Clean fridges, blast chillers, ovens, and microwaves', category: 'CLEANING & SHUTDOWN', sort_order: 9 },
      { id: 10, item_text: 'Empty & disinfect all sinks and drains', category: 'CLEANING & SHUTDOWN', sort_order: 10 },
      { id: 11, item_text: 'Clean/disinfect/store all silver trays, knives, and chopping boards', category: 'CLEANING & SHUTDOWN', sort_order: 11 },
      { id: 12, item_text: 'Store all plastic containers with lids in correct locations', category: 'CLEANING & SHUTDOWN', sort_order: 12 },
      { id: 13, item_text: 'Ensure all packaging items stock is stored neatly & sealed', category: 'CLEANING & SHUTDOWN', sort_order: 13 }
    ];
    setClosingChecklist(defaultClosing);
    const prog = {};
    defaultClosing.forEach(item => prog[item.id] = false);
    setClosingProgress(prog);
  };

  // Open Shop (only after opening checklist is complete)
  const handleOpenShop = () => {
    if (!currentCompletions.opening) {
      alert('❌ Please complete the opening checklist before opening the shop!');
      return;
    }

    if (window.confirm(`Open ${selectedLocation} for business?`)) {
      const newStatus = {
        ...shopStatus,
        [selectedLocation]: {
          isOpen: true,
          openTime: new Date().toISOString(),
          closeTime: null
        }
      };
      setShopStatus(newStatus);
      localStorage.setItem('shopStatus', JSON.stringify(newStatus));

      alert(`✅ ${selectedLocation} is now OPEN for business!`);
    }
  };

  // Close Shop (only after closing checklist is complete)
  const handleCloseShop = () => {
    if (!currentCompletions.closing) {
      alert('❌ Please complete the closing checklist before closing the shop!');
      return;
    }

    if (window.confirm(`Close ${selectedLocation} for the day?`)) {
      const newStatus = {
        ...shopStatus,
        [selectedLocation]: {
          isOpen: false,
          openTime: shopStatus[selectedLocation].openTime,
          closeTime: new Date().toISOString()
        }
      };
      setShopStatus(newStatus);
      localStorage.setItem('shopStatus', JSON.stringify(newStatus));

      alert(`✅ ${selectedLocation} is now CLOSED. Have a good evening!`);
    }
  };

  // Load data from database
  useEffect(() => {
    loadAllData();
  }, [selectedLocation]);

  // Listen for shop status changes from other components
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('shopStatus');
      if (saved) {
        setShopStatus(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadChecklists(),
        loadFridgeUnits(),
        loadTodaysCompletions(),
        loadRecentHistory()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load checklist items from database
  const loadChecklists = async () => {
    try {
      // Load opening checklist
      const { data: openingItems, error: openingError } = await supabase
        .from('opening_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (!openingError && openingItems && openingItems.length > 0) {
        setOpeningChecklist(openingItems);
      } else {
        setDefaultOpeningChecklist();
      }

      // Load mid-shift checklist
      const { data: midShiftItems, error: midShiftError } = await supabase
        .from('midshift_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (!midShiftError && midShiftItems && midShiftItems.length > 0) {
        setMidShiftChecklist(midShiftItems);
      } else {
        setDefaultMidShiftChecklist();
      }

      // Load closing checklist
      const { data: closingItems, error: closingError } = await supabase
        .from('closing_checklist_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (!closingError && closingItems && closingItems.length > 0) {
        setClosingChecklist(closingItems);
      } else {
        setDefaultClosingChecklist();
      }

      // Initialize progress
      const openingProg = {};
      const midShiftProg = {};
      const closingProg = {};
      (openingItems || []).forEach(item => openingProg[item.id] = false);
      (midShiftItems || []).forEach(item => midShiftProg[item.id] = false);
      (closingItems || []).forEach(item => closingProg[item.id] = false);
      setOpeningProgress(openingProg);
      setMidShiftProgress(midShiftProg);
      setClosingProgress(closingProg);
    } catch (error) {
      console.error('Error loading checklists:', error);
      setDefaultOpeningChecklist();
      setDefaultMidShiftChecklist();
      setDefaultClosingChecklist();
    }
  };

  // Load fridge/freezer units
  const loadFridgeUnits = async () => {
    try {
      const { data, error } = await supabase
        .from('fridge_freezer_units')
        .select('*')
        .eq('location', selectedLocation)
        .eq('is_active', true)
        .order('unit_name');

      if (!error && data && data.length > 0) {
        setFridgeUnits(data);
      } else {
        setDefaultFridgeUnits();
      }

      const temps = {};
      const notes = {};
      (data || []).forEach(unit => {
        temps[unit.id] = '';
        notes[unit.id] = '';
      });
      setTemperatureReadings(temps);
      setTempNotes(notes);
    } catch (error) {
      console.error('Error loading fridge units:', error);
      setDefaultFridgeUnits();
    }
  };

  // Default fridge units
  const setDefaultFridgeUnits = () => {
    const defaultUnits = [
      {
        id: 1,
        location: selectedLocation,
        unit_name: 'Fridge 1',
        unit_type: 'fridge',
        min_temp: 1.0,
        max_temp: 4.0
      },
      {
        id: 2,
        location: selectedLocation,
        unit_name: 'Fridge 2',
        unit_type: 'fridge',
        min_temp: 1.0,
        max_temp: 4.0
      },
      {
        id: 3,
        location: selectedLocation,
        unit_name: 'Freezer 1',
        unit_type: 'freezer',
        min_temp: -23.0,
        max_temp: -18.0
      }
    ];
    setFridgeUnits(defaultUnits);

    const temps = {};
    const notes = {};
    defaultUnits.forEach(unit => {
      temps[unit.id] = '';
      notes[unit.id] = '';
    });
    setTemperatureReadings(temps);
    setTempNotes(notes);
  };

  // Load today's completions for all locations
  const loadTodaysCompletions = async () => {
    const today = new Date().toISOString().split('T')[0];

    try {
      const completions = {
        'Eastham': {
          opening: null,
          midshift: null,
          closing: null,
          temperatures: []
        },
        'Bethnal Green': {
          opening: null,
          midshift: null,
          closing: null,
          temperatures: []
        }
      };

      for (const location of ['Eastham', 'Bethnal Green']) {
        const { data, error } = await supabase
          .from('daily_checklist_records')
          .select('*')
          .eq('location', location)
          .gte('completed_at', today)
          .lte('completed_at', today + 'T23:59:59');

        if (!error && data) {
          completions[location] = {
            opening: data.find(r => r.checklist_type === 'opening') || null,
            midshift: data.find(r => r.checklist_type === 'midshift') || null,
            closing: data.find(r => r.checklist_type === 'closing') || null,
            temperatures: data.filter(r => r.checklist_type === 'temperature') || []
          };
        }
      }

      setTodaysCompletions(completions);
    } catch (error) {
      console.error('Error loading today\'s completions:', error);
    }
  };

  // Load recent history
  const loadRecentHistory = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: checklistData } = await supabase
        .from('daily_checklist_records')
        .select('*')
        .eq('location', selectedLocation)
        .gte('completed_at', sevenDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      const { data: tempData } = await supabase
        .from('temperature_logs')
        .select('*, fridge_freezer_units(unit_name, unit_type)')
        .eq('location', selectedLocation)
        .gte('recorded_at', sevenDaysAgo.toISOString())
        .order('recorded_at', { ascending: false });

      setRecentHistory({
        checklists: checklistData || [],
        temperatures: tempData || []
      });
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  // Edit checklist item
  const handleEditItem = async (itemId, checklistType) => {
    if (!editText.trim()) {
      alert('Please enter item text');
      return;
    }

    try {
      const table = checklistType === 'opening' ? 'opening_checklist_items' :
                    checklistType === 'midshift' ? 'midshift_checklist_items' :
                    'closing_checklist_items';

      const { error } = await supabase
        .from(table)
        .update({ item_text: editText })
        .eq('id', itemId);

      if (error) throw error;

      await loadChecklists();
      setEditingItem(null);
      setEditText('');
      alert('✅ Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      alert('❌ Error updating item. Please try again.');
    }
  };

  // Delete checklist item
  const handleDeleteItem = async (itemId, checklistType) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const table = checklistType === 'opening' ? 'opening_checklist_items' :
                    checklistType === 'midshift' ? 'midshift_checklist_items' :
                    'closing_checklist_items';

      const { error } = await supabase
        .from(table)
        .update({ is_active: false })
        .eq('id', itemId);

      if (error) throw error;

      await loadChecklists();
      alert('✅ Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('❌ Error deleting item. Please try again.');
    }
  };

  // Move item up/down
  const handleMoveItem = async (itemId, direction, checklistType) => {
    try {
      const checklist = checklistType === 'opening' ? openingChecklist :
                        checklistType === 'midshift' ? midShiftChecklist :
                        closingChecklist;
      const table = checklistType === 'opening' ? 'opening_checklist_items' :
                    checklistType === 'midshift' ? 'midshift_checklist_items' :
                    'closing_checklist_items';

      const currentIndex = checklist.findIndex(item => item.id === itemId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= checklist.length) return;

      const currentItem = checklist[currentIndex];
      const targetItem = checklist[targetIndex];

      // Swap sort_order values
      await supabase.from(table).update({ sort_order: targetItem.sort_order }).eq('id', currentItem.id);
      await supabase.from(table).update({ sort_order: currentItem.sort_order }).eq('id', targetItem.id);

      await loadChecklists();
    } catch (error) {
      console.error('Error moving item:', error);
      alert('❌ Error moving item. Please try again.');
    }
  };

  // Add new checklist item
  const handleAddChecklistItem = async () => {
    if (!newItemText.trim()) {
      alert('Please enter checklist item text');
      return;
    }

    try {
      const table = newItemType === 'opening' ? 'opening_checklist_items' :
                    newItemType === 'midshift' ? 'midshift_checklist_items' :
                    'closing_checklist_items';
      const currentList = newItemType === 'opening' ? openingChecklist :
                          newItemType === 'midshift' ? midShiftChecklist :
                          closingChecklist;
      const maxOrder = Math.max(...currentList.map(i => i.sort_order || 0), 0);

      const { data, error } = await supabase
        .from(table)
        .insert({
          item_text: newItemText,
          category: newItemCategory || null,
          sort_order: maxOrder + 1,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      await loadChecklists();
      setNewItemText('');
      setNewItemCategory('');
      setShowAddItem(false);
      alert('✅ Checklist item added successfully!');
    } catch (error) {
      console.error('Error adding checklist item:', error);
      alert('❌ Error adding item. Please try again.');
    }
  };

  // Add new fridge/freezer unit
  const handleAddFridgeUnit = async () => {
    if (!newUnit.name.trim()) {
      alert('Please enter unit name');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('fridge_freezer_units')
        .insert({
          location: selectedLocation,
          unit_name: newUnit.name,
          unit_type: newUnit.type,
          min_temp: parseFloat(newUnit.minTemp),
          max_temp: parseFloat(newUnit.maxTemp),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      await loadFridgeUnits();
      setNewUnit({ name: '', type: 'fridge', minTemp: 1, maxTemp: 4 });
      setShowAddUnit(false);
      alert('✅ Unit added successfully!');
    } catch (error) {
      console.error('Error adding unit:', error);
      alert('❌ Error adding unit. Please try again.');
    }
  };

  // Handle checklist item toggle
  const handleChecklistToggle = (checklistType, itemId) => {
    if (checklistType === 'opening' && currentCompletions.opening) {
      alert('❌ Opening checklist already completed today!');
      return;
    }
    if (checklistType === 'midshift' && currentCompletions.midshift) {
      alert('❌ Mid-shift checklist already completed today!');
      return;
    }
    if (checklistType === 'closing' && currentCompletions.closing) {
      alert('❌ Closing checklist already completed today!');
      return;
    }

    if (checklistType === 'opening') {
      setOpeningProgress(prev => ({
        ...prev,
        [itemId]: !prev[itemId]
      }));
    } else if (checklistType === 'midshift') {
      setMidShiftProgress(prev => ({
        ...prev,
        [itemId]: !prev[itemId]
      }));
    } else {
      setClosingProgress(prev => ({
        ...prev,
        [itemId]: !prev[itemId]
      }));
    }
  };

  // Submit checklist
  const submitChecklist = async (checklistType) => {
    if (checklistType === 'opening' && currentCompletions.opening) {
      alert('❌ Opening checklist already completed today!');
      return;
    }
    if (checklistType === 'midshift' && currentCompletions.midshift) {
      alert('❌ Mid-shift checklist already completed today!');
      return;
    }
    if (checklistType === 'closing' && currentCompletions.closing) {
      alert('❌ Closing checklist already completed today!');
      return;
    }

    const checklist = checklistType === 'opening' ? openingChecklist :
                      checklistType === 'midshift' ? midShiftChecklist :
                      closingChecklist;
    const progress = checklistType === 'opening' ? openingProgress :
                     checklistType === 'midshift' ? midShiftProgress :
                     closingProgress;

    const allCompleted = checklist.every(item => progress[item.id] === true);
    const incomplete = checklist.filter(item => !progress[item.id]);

    if (!allCompleted) {
      const confirmSubmit = window.confirm(
        `⚠️ WARNING: ${incomplete.length} items not checked!\n\n` +
        `Incomplete items:\n${incomplete.map(i => `• ${i.item_text}`).join('\n')}\n\n` +
        `Are you sure you want to submit an incomplete checklist?`
      );

      if (!confirmSubmit) return;
    }

    // If closing checklist, prompt for daily summary
    let summaryData = null;
    if (checklistType === 'closing') {
      const startStock = prompt('Enter Start Stock:');
      const endStock = prompt('Enter End Stock:');
      const wasteQty = prompt('Enter Waste Quantity:');
      const reorderPlaced = window.confirm('Was a reorder placed today?');
      const notes = prompt('Any additional notes for head office?');

      summaryData = {
        start_stock: startStock,
        end_stock: endStock,
        waste_qty: wasteQty,
        reorder_placed: reorderPlaced,
        summary_notes: notes
      };
    }

    try {
      const completedAt = new Date().toISOString();

      const { data: record, error: recordError } = await supabase
        .from('daily_checklist_records')
        .insert({
          location: selectedLocation,
          checklist_type: checklistType,
          completed_by: currentUser?.name || currentUser?.username || 'Unknown User',
          completed_at: completedAt,
          all_items_checked: allCompleted,
          notes: checklistNotes,
          ...summaryData
        })
        .select()
        .single();

      if (recordError) throw recordError;

      const completions = checklist.map(item => ({
        record_id: record.id,
        item_id: item.id,
        is_completed: progress[item.id] || false,
        completed_at: progress[item.id] ? completedAt : null
      }));

      const { error: completionsError } = await supabase
        .from('checklist_completions')
        .insert(completions);

      if (completionsError) throw completionsError;

      const checklistName = checklistType === 'opening' ? 'Opening' :
                            checklistType === 'midshift' ? 'Mid-Shift' :
                            'Closing';

      alert(
        `✅ ${checklistName} Checklist Completed!\n\n` +
        `Location: ${selectedLocation}\n` +
        `Completed by: ${currentUser?.name || currentUser?.username}\n` +
        `Time: ${new Date(completedAt).toLocaleTimeString()}\n` +
        `Status: ${allCompleted ? 'All items completed ✓' : `${incomplete.length} items incomplete ⚠️`}`
      );

      setTodaysCompletions(prev => ({
        ...prev,
        [selectedLocation]: {
          ...prev[selectedLocation],
          [checklistType]: record
        }
      }));

      // Reset form
      if (checklistType === 'opening') {
        const newProgress = {};
        openingChecklist.forEach(item => newProgress[item.id] = false);
        setOpeningProgress(newProgress);
      } else if (checklistType === 'midshift') {
        const newProgress = {};
        midShiftChecklist.forEach(item => newProgress[item.id] = false);
        setMidShiftProgress(newProgress);
      } else {
        const newProgress = {};
        closingChecklist.forEach(item => newProgress[item.id] = false);
        setClosingProgress(newProgress);
      }
      setChecklistNotes('');

    } catch (error) {
      console.error('Error submitting checklist:', error);
      alert('❌ Error submitting checklist. Please try again.');
    }
  };

  // Submit temperature readings
  const submitTemperatures = async () => {
    const hasReadings = Object.values(temperatureReadings).some(temp => temp !== '');

    if (!hasReadings) {
      alert('❌ Please enter at least one temperature reading');
      return;
    }

    try {
      const logs = [];
      const recordedAt = new Date().toISOString();

      for (const unit of fridgeUnits) {
        const temp = parseFloat(temperatureReadings[unit.id]);
        if (!isNaN(temp)) {
          const isNormal = temp >= unit.min_temp && temp <= unit.max_temp;

          logs.push({
            location: selectedLocation,
            unit_id: unit.id,
            temperature: temp,
            recorded_by: currentUser?.name || currentUser?.username || 'Unknown User',
            recorded_at: recordedAt,
            is_normal: isNormal,
            notes: tempNotes[unit.id] || null
          });

          if (!isNormal) {
            setTimeout(() => {
              alert(
                `🚨 TEMPERATURE ALERT! 🚨\n\n` +
                `${unit.unit_name} is OUT OF RANGE!\n` +
                `Current: ${temp}°C\n` +
                `Normal range: ${unit.min_temp}°C to ${unit.max_temp}°C\n\n` +
                `ACTION REQUIRED:\n` +
                `1. Check the unit immediately\n` +
                `2. Move items if necessary\n` +
                `3. Call maintenance if problem persists`
              );
            }, 100);
          }
        }
      }

      if (logs.length > 0) {
        const { error } = await supabase
          .from('temperature_logs')
          .insert(logs);

        if (error) throw error;

        alert(
          `✅ Temperature Readings Recorded!\n\n` +
          `Location: ${selectedLocation}\n` +
          `Units recorded: ${logs.length}\n` +
          `Recorded by: ${currentUser?.name || currentUser?.username}\n` +
          `Time: ${new Date(recordedAt).toLocaleTimeString()}`
        );

        const newReadings = {};
        const newNotes = {};
        fridgeUnits.forEach(unit => {
          newReadings[unit.id] = '';
          newNotes[unit.id] = '';
        });
        setTemperatureReadings(newReadings);
        setTempNotes(newNotes);

        await loadRecentHistory();
      }
    } catch (error) {
      console.error('Error submitting temperatures:', error);
      alert('❌ Error submitting temperature readings. Please try again.');
    }
  };

  // Calculate checklist completion percentage
  const calculateProgress = (checklist, progress) => {
    if (checklist.length === 0) return 0;
    const completed = checklist.filter(item => progress[item.id] === true).length;
    return Math.round((completed / checklist.length) * 100);
  };

  // Get temperature status color
  const getTempStatusColor = (temp, min, max) => {
    if (temp === '' || temp === null) return 'gray';
    const numTemp = parseFloat(temp);
    if (numTemp < min || numTemp > max) return 'red';
    if (numTemp <= min + 0.5 || numTemp >= max - 0.5) return 'yellow';
    return 'green';
  };

  // Render checklist items with categories
  const renderChecklistItems = (checklist, progress, checklistType, isCompleted) => {
    const categories = [...new Set(checklist.map(item => item.category).filter(Boolean))];

    return (
      <div className="space-y-4">
        {categories.length > 0 ? (
          categories.map(category => (
            <div key={category}>
              <h4 className="font-semibold text-sm text-gray-600 mb-2 uppercase tracking-wider">
                {category}
              </h4>
              <div className="space-y-2">
                {checklist
                  .filter(item => item.category === category)
                  .map(item => renderChecklistItem(item, progress, checklistType, isCompleted))}
              </div>
            </div>
          ))
        ) : (
          <div className="space-y-2">
            {checklist.map(item => renderChecklistItem(item, progress, checklistType, isCompleted))}
          </div>
        )}

        {/* Items without category */}
        {checklist.filter(item => !item.category).length > 0 && (
          <div className="space-y-2">
            {checklist
              .filter(item => !item.category)
              .map(item => renderChecklistItem(item, progress, checklistType, isCompleted))}
          </div>
        )}
      </div>
    );
  };

  // Render individual checklist item
  const renderChecklistItem = (item, progress, checklistType, isCompleted) => {
    const isEditing = editingItem === item.id;

    return (
      <div
        key={item.id}
        className={`flex items-center p-4 rounded-lg border transition-all ${
          progress[item.id]
            ? 'bg-green-50 border-green-300'
            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }`}
      >
        <div className="flex-1">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 p-2 border rounded"
                autoFocus
              />
              <button
                onClick={() => handleEditItem(item.id, checklistType)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setEditText('');
                }}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className={`font-medium ${
              progress[item.id] ? 'text-green-800' : 'text-gray-700'
            }`}>
              {item.item_text}
            </p>
          )}
        </div>

        {!isCompleted && editMode && !isEditing && (
          <div className="flex items-center space-x-2 mr-4">
            <button
              onClick={() => handleMoveItem(item.id, 'up', checklistType)}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Move up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => handleMoveItem(item.id, 'down', checklistType)}
              className="p-1 text-gray-500 hover:text-gray-700"
              title="Move down"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={() => {
                setEditingItem(item.id);
                setEditText(item.item_text);
              }}
              className="p-1 text-blue-500 hover:text-blue-700"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => handleDeleteItem(item.id, checklistType)}
              className="p-1 text-red-500 hover:text-red-700"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <input
          type="checkbox"
          checked={progress[item.id] || false}
          onChange={() => handleChecklistToggle(checklistType, item.id)}
          disabled={isCompleted}
          className="w-5 h-5 text-green-600 rounded cursor-pointer"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p>Loading checklists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with Location Switcher */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <CheckSquare className="mr-2" /> DOZT & RICE AFFAIR - Daily Operational Checks
        </h2>

        {/* Location Switcher & Edit Mode */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 rounded-lg flex items-center ${
              editMode ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            <Edit3 size={16} className="mr-2" />
            {editMode ? 'Exit Edit Mode' : 'Edit Checklists'}
          </button>

          <div className="flex items-center space-x-2">
            <MapPin size={20} className="text-gray-600" />
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="Eastham">Eastham</option>
              <option value="Bethnal Green">Bethnal Green</option>
            </select>
          </div>
        </div>
      </div>

      {/* Date and User Info Bar */}
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <span className="text-sm text-gray-600">Date:</span>
            <p className="font-bold">{new Date().toLocaleDateString()}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Branch/Kitchen:</span>
            <p className="font-bold">{selectedLocation}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Name:</span>
            <p className="font-bold">{currentUser?.name || currentUser?.username || 'Not logged in'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-600">Signature:</span>
            <p className="font-bold">____________________</p>
          </div>
        </div>
      </div>

      {/* Shop Status Bar */}
      <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
        currentShopStatus?.isOpen
          ? 'bg-green-50 border-2 border-green-400'
          : 'bg-red-50 border-2 border-red-400'
      }`}>
        <div className="flex items-center space-x-4">
          <Store size={24} className={currentShopStatus?.isOpen ? 'text-green-600' : 'text-red-600'} />
          <div>
            <h3 className={`font-bold text-xl ${
              currentShopStatus?.isOpen ? 'text-green-800' : 'text-red-800'
            }`}>
              📍 {selectedLocation} - {currentShopStatus?.isOpen ? 'OPEN FOR BUSINESS' : 'CLOSED'}
            </h3>
            {currentShopStatus?.openTime && (
              <p className="text-sm text-gray-600">
                Opened at: {new Date(currentShopStatus.openTime).toLocaleTimeString()}
              </p>
            )}
            {currentShopStatus?.closeTime && !currentShopStatus?.isOpen && (
              <p className="text-sm text-gray-600">
                Closed at: {new Date(currentShopStatus.closeTime).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {!currentShopStatus?.isOpen && !currentCompletions.opening && (
            <span className="text-sm text-yellow-600 font-medium">
              ⚠️ Complete opening checklist first
            </span>
          )}
          {currentShopStatus?.isOpen && !currentCompletions.closing && (
            <span className="text-sm text-yellow-600 font-medium">
              ⚠️ Remember closing checklist
            </span>
          )}

          {currentShopStatus?.isOpen ? (
            <button
              onClick={handleCloseShop}
              className={`px-6 py-3 ${
                currentCompletions.closing
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-400 cursor-not-allowed'
              } text-white rounded-lg flex items-center font-bold`}
              title={!currentCompletions.closing ? 'Complete closing checklist first' : 'Close shop'}
            >
              <Lock className="mr-2" size={20} />
              Close Shop
            </button>
          ) : (
            <button
              onClick={handleOpenShop}
              className={`px-6 py-3 ${
                currentCompletions.opening
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-400 cursor-not-allowed'
              } text-white rounded-lg flex items-center font-bold`}
              title={!currentCompletions.opening ? 'Complete opening checklist first' : 'Open shop'}
            >
              <Unlock className="mr-2" size={20} />
              Open Shop
            </button>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className={`p-4 rounded-lg border-2 ${
          currentCompletions.opening ? 'bg-green-50 border-green-400' : 'bg-yellow-50 border-yellow-400'
        }`}>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-600">Opening (Before 11am)</p>
            {currentCompletions.opening ? (
              <>
                <p className="text-lg font-bold text-green-600">✅ Completed</p>
                <p className="text-xs text-gray-500">
                  {new Date(currentCompletions.opening.completed_at).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-yellow-600">⏳ Pending</p>
            )}
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 ${
          currentCompletions.midshift ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-300'
        }`}>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-600">Mid-Shift</p>
            {currentCompletions.midshift ? (
              <>
                <p className="text-lg font-bold text-green-600">✅ Completed</p>
                <p className="text-xs text-gray-500">
                  {new Date(currentCompletions.midshift.completed_at).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-gray-400">⏳ Pending</p>
            )}
          </div>
        </div>

        <div className={`p-4 rounded-lg border-2 ${
          currentCompletions.closing ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-300'
        }`}>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-600">Closing (End of Day)</p>
            {currentCompletions.closing ? (
              <>
                <p className="text-lg font-bold text-green-600">✅ Completed</p>
                <p className="text-xs text-gray-500">
                  {new Date(currentCompletions.closing.completed_at).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p className="text-lg font-bold text-gray-400">⏳ Pending</p>
            )}
          </div>
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-400">
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-600">Temperature Checks</p>
            <p className="text-lg font-bold text-blue-600">{fridgeUnits.length} Units</p>
            <p className="text-xs text-gray-500">Ready for logging</p>
          </div>
        </div>

        <div className="p-4 bg-purple-50 rounded-lg border-2 border-purple-400">
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-600">WhatsApp Photo</p>
            <p className="text-lg font-bold text-purple-600">📸 Required</p>
            <p className="text-xs text-gray-500">After each section</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'opening', label: 'Opening', icon: Sun, time: 'Before 11am' },
          { id: 'midshift', label: 'Mid-Shift', icon: Coffee, time: 'Lunch/Dinner' },
          { id: 'closing', label: 'Closing', icon: Moon, time: 'End of Day' },
          { id: 'temperature', label: 'Temperature', icon: Thermometer },
          { id: 'history', label: 'History', icon: Calendar }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon size={20} />
                <span className="font-medium">{tab.label}</span>
              </div>
              {tab.time && (
                <span className="text-xs text-gray-500 mt-1">{tab.time}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Opening Checklist Tab */}
      {activeTab === 'opening' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">OPENING CHECKS (Before 11:00 AM)</h3>
              <p className="text-sm text-gray-600 mt-1">Complete all items and submit photo to WhatsApp group</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-lg font-bold">
                {calculateProgress(openingChecklist, openingProgress)}%
              </div>
              {!currentCompletions.opening && editMode && (
                <button
                  onClick={() => setShowAddItem(!showAddItem)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add Item
                </button>
              )}
            </div>
          </div>

          {currentCompletions.opening && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Completed at {new Date(currentCompletions.opening.completed_at).toLocaleTimeString()}
                by {currentCompletions.opening.completed_by}
              </p>
            </div>
          )}

          {showAddItem && !currentCompletions.opening && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="flex-1 p-2 border rounded"
                  placeholder="Enter new checklist item..."
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">No Category</option>
                  <option value="STOCK & SPOILAGE">Stock & Spoilage</option>
                  <option value="CLEANING & HYGIENE">Cleaning & Hygiene</option>
                </select>
                <button
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItemText('');
                    setNewItemCategory('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {renderChecklistItems(openingChecklist, openingProgress, 'opening', currentCompletions.opening !== null)}

          {!currentCompletions.opening && (
            <>
              <div className="mt-6 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={checklistNotes}
                  onChange={(e) => setChecklistNotes(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  rows="3"
                  placeholder="Any issues or observations..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  📸 Remember: Submit photo in WhatsApp group after completing this section
                </p>
              </div>

              <button
                onClick={() => submitChecklist('opening')}
                className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center justify-center"
              >
                <Save className="mr-2" size={20} />
                Submit Opening Checklist
              </button>
            </>
          )}
        </div>
      )}

      {/* Mid-Shift Checklist Tab */}
      {activeTab === 'midshift' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">MID-SHIFT CHECKS (Before Lunch & Dinner Rush)</h3>
              <p className="text-sm text-gray-600 mt-1">Complete all items and submit photo to WhatsApp group</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-lg font-bold">
                {calculateProgress(midShiftChecklist, midShiftProgress)}%
              </div>
              {!currentCompletions.midshift && editMode && (
                <button
                  onClick={() => {
                    setShowAddItem(!showAddItem);
                    setNewItemType('midshift');
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add Item
                </button>
              )}
            </div>
          </div>

          {currentCompletions.midshift && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Completed at {new Date(currentCompletions.midshift.completed_at).toLocaleTimeString()}
                by {currentCompletions.midshift.completed_by}
              </p>
            </div>
          )}

          {showAddItem && !currentCompletions.midshift && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="flex-1 p-2 border rounded"
                  placeholder="Enter new checklist item..."
                />
                <button
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItemText('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-400 rounded-lg p-4 mb-4">
            <p className="text-amber-800 text-sm">
              ⏰ <strong>Reorder Cut-off Times:</strong> 12pm for same day | 4pm for next day
            </p>
          </div>

          {renderChecklistItems(midShiftChecklist, midShiftProgress, 'midshift', currentCompletions.midshift !== null)}

          {!currentCompletions.midshift && (
            <>
              <div className="mt-6 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={checklistNotes}
                  onChange={(e) => setChecklistNotes(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  rows="3"
                  placeholder="Any issues or observations..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  📸 Remember: Submit photo in WhatsApp group after completing this section
                </p>
              </div>

              <button
                onClick={() => submitChecklist('midshift')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center"
              >
                <Save className="mr-2" size={20} />
                Submit Mid-Shift Checklist
              </button>
            </>
          )}
        </div>
      )}

      {/* Closing Checklist Tab */}
      {activeTab === 'closing' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">CLOSING CHECKS (End of Day)</h3>
              <p className="text-sm text-gray-600 mt-1">Complete all items and submit photo to WhatsApp group</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-lg font-bold">
                {calculateProgress(closingChecklist, closingProgress)}%
              </div>
              {!currentCompletions.closing && editMode && (
                <button
                  onClick={() => {
                    setShowAddItem(!showAddItem);
                    setNewItemType('closing');
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
                >
                  <Plus size={16} className="mr-1" />
                  Add Item
                </button>
              )}
            </div>
          </div>

          {currentCompletions.closing && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded-lg">
              <p className="text-green-800 font-medium">
                ✅ Completed at {new Date(currentCompletions.closing.completed_at).toLocaleTimeString()}
                by {currentCompletions.closing.completed_by}
              </p>
            </div>
          )}

          {showAddItem && !currentCompletions.closing && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  className="flex-1 p-2 border rounded"
                  placeholder="Enter new checklist item..."
                />
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="p-2 border rounded"
                >
                  <option value="">No Category</option>
                  <option value="STOCK & WASTE">Stock & Waste</option>
                  <option value="CLEANING & SHUTDOWN">Cleaning & Shutdown</option>
                </select>
                <button
                  onClick={handleAddChecklistItem}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowAddItem(false);
                    setNewItemText('');
                    setNewItemCategory('');
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {renderChecklistItems(closingChecklist, closingProgress, 'closing', currentCompletions.closing !== null)}

          {!currentCompletions.closing && (
            <>
              <div className="mt-6 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={checklistNotes}
                  onChange={(e) => setChecklistNotes(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                  rows="3"
                  placeholder="Any issues or observations..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">
                  📸 Remember: Submit photo in WhatsApp group after completing this section
                </p>
                <p className="text-yellow-800 text-sm mt-2">
                  ℹ️ You will be prompted for Daily Summary after submission (Start Stock, End Stock, Waste Qty, etc.)
                </p>
              </div>

              <button
                onClick={() => submitChecklist('closing')}
                className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold flex items-center justify-center"
              >
                <Save className="mr-2" size={20} />
                Submit Closing Checklist & Daily Summary
              </button>
            </>
          )}
        </div>
      )}

      {/* Temperature Logs Tab */}
      {activeTab === 'temperature' && (
        <div className="bg-white border rounded-lg p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">Temperature Readings - {selectedLocation}</h3>
            <button
              onClick={() => setShowAddUnit(!showAddUnit)}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add Unit
            </button>
          </div>

          {showAddUnit && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-300 rounded-lg">
              <div className="grid grid-cols-5 gap-2">
                <input
                  type="text"
                  value={newUnit.name}
                  onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                  className="p-2 border rounded"
                  placeholder="Unit name (e.g., Fridge 3)"
                />
                <select
                  value={newUnit.type}
                  onChange={(e) => {
                    const type = e.target.value;
                    setNewUnit({
                      ...newUnit,
                      type,
                      minTemp: type === 'freezer' ? -23 : 1,
                      maxTemp: type === 'freezer' ? -18 : 4
                    });
                  }}
                  className="p-2 border rounded"
                >
                  <option value="fridge">Fridge</option>
                  <option value="freezer">Freezer</option>
                </select>
                <input
                  type="number"
                  value={newUnit.minTemp}
                  onChange={(e) => setNewUnit({...newUnit, minTemp: e.target.value})}
                  className="p-2 border rounded"
                  placeholder="Min temp"
                />
                <input
                  type="number"
                  value={newUnit.maxTemp}
                  onChange={(e) => setNewUnit({...newUnit, maxTemp: e.target.value})}
                  className="p-2 border rounded"
                  placeholder="Max temp"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleAddFridgeUnit}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddUnit(false);
                      setNewUnit({ name: '', type: 'fridge', minTemp: 1, maxTemp: 4 });
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {fridgeUnits.map(unit => {
              const temp = temperatureReadings[unit.id];
              const statusColor = getTempStatusColor(temp, unit.min_temp, unit.max_temp);

              return (
                <div key={unit.id} className={`border-2 rounded-lg p-4 ${
                  statusColor === 'red' ? 'border-red-400 bg-red-50' :
                  statusColor === 'yellow' ? 'border-yellow-400 bg-yellow-50' :
                  statusColor === 'green' ? 'border-green-400 bg-green-50' :
                  'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-bold text-lg">{unit.unit_name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      unit.unit_type === 'fridge'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {unit.unit_type}
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature (°C)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperatureReadings[unit.id] || ''}
                      onChange={(e) => setTemperatureReadings(prev => ({
                        ...prev,
                        [unit.id]: e.target.value
                      }))}
                      className={`w-full p-2 border-2 rounded-lg text-lg font-bold text-center ${
                        statusColor === 'red' ? 'border-red-400 bg-red-100' :
                        statusColor === 'yellow' ? 'border-yellow-400 bg-yellow-100' :
                        statusColor === 'green' ? 'border-green-400 bg-green-100' :
                        'border-gray-300'
                      }`}
                      placeholder="0.0"
                    />
                  </div>

                  <div className="text-sm text-gray-600 mb-3">
                    <div className="flex justify-between">
                      <span>Normal Range:</span>
                      <span className="font-medium">
                        {unit.min_temp}°C to {unit.max_temp}°C
                      </span>
                    </div>
                  </div>

                  {statusColor === 'red' && temp !== '' && (
                    <div className="mb-3 p-2 bg-red-200 rounded text-xs font-bold text-red-800">
                      ⚠️ TEMPERATURE OUT OF RANGE!
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={tempNotes[unit.id] || ''}
                      onChange={(e) => setTempNotes(prev => ({
                        ...prev,
                        [unit.id]: e.target.value
                      }))}
                      className="w-full p-1 border rounded text-sm"
                      placeholder="Any issues..."
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={submitTemperatures}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center"
          >
            <Save className="mr-2" size={20} />
            Submit Temperature Readings
          </button>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-6">Recent History - {selectedLocation} (Last 7 Days)</h3>

          {/* Checklist History */}
          <div className="mb-8">
            <h4 className="font-semibold mb-4 text-gray-700">Checklist Completions</h4>
            {recentHistory.checklists && recentHistory.checklists.length > 0 ? (
              <div className="space-y-2">
                {recentHistory.checklists.map(record => (
                  <div key={record.id} className={`p-3 rounded-lg border ${
                    record.all_items_checked
                      ? 'bg-green-50 border-green-300'
                      : 'bg-yellow-50 border-yellow-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`font-medium ${
                          record.checklist_type === 'opening' ? 'text-blue-700' :
                          record.checklist_type === 'midshift' ? 'text-orange-700' :
                          'text-purple-700'
                        }`}>
                          {record.checklist_type === 'opening' ? '🌅 Opening' :
                           record.checklist_type === 'midshift' ? '☕ Mid-Shift' :
                           '🌙 Closing'} Checklist
                        </span>
                        <div className="text-sm text-gray-600 mt-1">
                          By: {record.completed_by} | {new Date(record.completed_at).toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right">
                        {record.all_items_checked ? (
                          <span className="text-green-600 font-bold">✅ Complete</span>
                        ) : (
                          <span className="text-yellow-600 font-bold">⚠️ Incomplete</span>
                        )}
                      </div>
                    </div>
                    {record.notes && (
                      <div className="mt-2 text-sm text-gray-600 italic">
                        Notes: {record.notes}
                      </div>
                    )}
                    {record.checklist_type === 'closing' && record.start_stock && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                        <strong>Daily Summary:</strong>
                        <div className="grid grid-cols-4 gap-2 mt-1">
                          <span>Start: {record.start_stock}</span>
                          <span>End: {record.end_stock}</span>
                          <span>Waste: {record.waste_qty}</span>
                          <span>Reorder: {record.reorder_placed ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No checklist records found</p>
            )}
          </div>

          {/* Temperature History */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-700">Temperature Logs</h4>
            {recentHistory.temperatures && recentHistory.temperatures.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date/Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Unit</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Temperature</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentHistory.temperatures.map(log => (
                      <tr key={log.id} className={!log.is_normal ? 'bg-red-50' : ''}>
                        <td className="px-4 py-2 text-sm">
                          {new Date(log.recorded_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {log.fridge_freezer_units?.unit_name}
                        </td>
                        <td className="px-4 py-2 text-sm text-center font-bold">
                          {log.temperature}°C
                        </td>
                        <td className="px-4 py-2 text-center">
                          {log.is_normal ? (
                            <span className="text-green-600">✅</span>
                          ) : (
                            <span className="text-red-600 font-bold">⚠️ OUT OF RANGE</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {log.recorded_by}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No temperature logs found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopDailyChecks;
