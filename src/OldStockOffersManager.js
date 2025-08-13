// OldStockOffersManager.js
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, DollarSign, Tag, Percent, Clock, MapPin,
  Send, Copy, MessageSquare, Instagram, Phone, CheckCircle,
  TrendingDown, Calendar, RefreshCw, Zap, ChevronRight,
  Facebook, Share2, Megaphone, ShoppingBag, Target
} from 'lucide-react';

const OldStockOffersManager = ({
  sales = [],
  dispatch = [],
  prepLog = [],
  calculateDishCost,
  onCreateOffer, // Callback when offer is created
  onSendNotification // Callback for notifications
}) => {
  const [oldStockItems, setOldStockItems] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [offerStrategy, setOfferStrategy] = useState('automatic');
  const [generatedOffers, setGeneratedOffers] = useState([]);
  const [offerTemplates, setOfferTemplates] = useState([]);
  const [activeOffers, setActiveOffers] = useState([]);

  // Offer discount tiers based on urgency
  const discountTiers = {
    expired: { discount: 50, label: 'CLEARANCE', color: 'red', priority: 1 },
    today: { discount: 40, label: 'LAST DAY', color: 'orange', priority: 2 },
    tomorrow: { discount: 30, label: 'LIMITED TIME', color: 'yellow', priority: 3 },
    oldStock: { discount: 25, label: 'SPECIAL OFFER', color: 'blue', priority: 4 },
    bulk: { discount: 20, label: 'BULK DEAL', color: 'green', priority: 5 }
  };

  // Marketing channels configuration
  const marketingChannels = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'green' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'purple' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'blue' },
    { id: 'sms', name: 'SMS', icon: Phone, color: 'gray' },
    { id: 'instore', name: 'In-Store', icon: Megaphone, color: 'orange' }
  ];

  // Calculate old stock items and generate offers
  const calculateOldStock = () => {
    const items = [];
    const offers = [];
    const todayDate = new Date().toISOString().split('T')[0];

    // Get all dish names
    const allDishes = [...new Set([
      ...sales.map(s => s.dishName),
      ...dispatch.map(d => d.dishName),
      ...prepLog.map(p => p.dishName)
    ])];

    allDishes.forEach(dishName => {
      // Get old stock from end-of-day closings
      const oldStockByLocation = {
        'Eastham': { portions: 0, batches: [], avgAge: 0 },
        'Bethnal Green': { portions: 0, batches: [], avgAge: 0 }
      };

      // Collect old stock from sales (end-of-day items)
      sales
        .filter(s =>
          s.dishName === dishName &&
          s.endOfDay &&
          s.remainingPortions > 0 &&
          s.date !== todayDate
        )
        .forEach(s => {
          const daysOld = Math.floor((new Date() - new Date(s.date)) / (1000 * 60 * 60 * 24));
          const location = s.location;

          if (oldStockByLocation[location]) {
            oldStockByLocation[location].portions += s.remainingPortions;
            oldStockByLocation[location].batches.push({
              batchNumber: s.batchNumber,
              portions: s.remainingPortions,
              date: s.date,
              daysOld,
              expiryDate: s.expiryDate
            });
            oldStockByLocation[location].avgAge =
              (oldStockByLocation[location].avgAge + daysOld) /
              oldStockByLocation[location].batches.length;
          }
        });

      // Check for items expiring soon in prep log
      prepLog
        .filter(p => p.dishName === dishName && !p.processed && p.expiryDate)
        .forEach(p => {
          const expiryDate = new Date(p.expiryDate);
          const hoursUntilExpiry = (expiryDate - new Date()) / (1000 * 60 * 60);

          if (hoursUntilExpiry < 48) {
            // Add to cold room/central kitchen old stock
            const urgency = hoursUntilExpiry < 0 ? 'expired' :
                          hoursUntilExpiry < 24 ? 'today' : 'tomorrow';

            items.push({
              dishName,
              location: 'Central Kitchen',
              portions: p.totalPortions,
              urgency,
              hoursUntilExpiry,
              expiryDate: p.expiryDate,
              batchNumber: p.batchNumber
            });
          }
        });

      // Process location-specific old stock
      Object.entries(oldStockByLocation).forEach(([location, data]) => {
        if (data.portions > 0) {
          const urgencyLevel = data.avgAge >= 2 ? 'expired' :
                              data.avgAge >= 1 ? 'today' : 'oldStock';

          items.push({
            dishName,
            location,
            portions: data.portions,
            batches: data.batches,
            avgAge: Math.round(data.avgAge),
            urgency: urgencyLevel,
            totalValue: calculateDishCost ?
              calculateDishCost(dishName, data.portions * 0.16) :
              data.portions * 8 // Default £8 per portion
          });

          // Generate automatic offer
          if (offerStrategy === 'automatic') {
            const offer = generateAutomaticOffer(
              dishName,
              location,
              data.portions,
              urgencyLevel,
              data.avgAge
            );
            offers.push(offer);
          }
        }
      });
    });

    setOldStockItems(items);
    setGeneratedOffers(offers);
    generateOfferTemplates(items);
  };

  // Generate automatic offer based on urgency
  const generateAutomaticOffer = (dishName, location, portions, urgency, daysOld) => {
    const tier = discountTiers[urgency] || discountTiers.oldStock;
    const originalPrice = 8; // Default price per portion
    const offerPrice = originalPrice * (1 - tier.discount / 100);

    // Smart offer bundling
    let offerType = 'single';
    let bundleSize = 1;
    let bundlePrice = offerPrice;

    if (portions >= 10) {
      offerType = 'bundle';
      bundleSize = 3;
      bundlePrice = offerPrice * 2.5; // Buy 3 for price of 2.5
    } else if (portions >= 5) {
      offerType = 'combo';
      bundleSize = 2;
      bundlePrice = offerPrice * 1.7; // Buy 2 for price of 1.7
    }

    return {
      id: `${dishName}-${location}-${Date.now()}`,
      dishName,
      location,
      portions,
      urgency,
      tier,
      offerType,
      bundleSize,
      originalPrice,
      offerPrice: offerPrice.toFixed(2),
      bundlePrice: bundlePrice.toFixed(2),
      discount: tier.discount,
      validUntil: calculateOfferExpiry(urgency),
      createdAt: new Date().toISOString(),
      status: 'pending',
      daysOld,
      headline: generateOfferHeadline(dishName, tier, offerType),
      description: generateOfferDescription(dishName, portions, daysOld, tier)
    };
  };

  // Generate offer headline
  const generateOfferHeadline = (dishName, tier, offerType) => {
    const headlines = {
      expired: `🚨 FINAL CLEARANCE: ${dishName} - ${tier.discount}% OFF!`,
      today: `⏰ TODAY ONLY: ${dishName} - ${tier.discount}% OFF!`,
      tomorrow: `🔥 LIMITED TIME: ${dishName} - ${tier.discount}% OFF!`,
      oldStock: `💰 SPECIAL OFFER: ${dishName} - ${tier.discount}% OFF!`,
      bulk: `📦 BULK DEAL: ${dishName} - Save ${tier.discount}%!`
    };

    return headlines[tier.priority === 1 ? 'expired' :
                    tier.priority === 2 ? 'today' :
                    tier.priority === 3 ? 'tomorrow' : 'oldStock'];
  };

  // Generate offer description
  const generateOfferDescription = (dishName, portions, daysOld, tier) => {
    const freshness = daysOld <= 1 ? "Made yesterday - still fresh!" :
                     daysOld === 2 ? "2 days old - perfect quality!" :
                     "Limited availability!";

    return `${freshness} Only ${portions} portions available. ${tier.label} pricing - grab yours before it's gone!`;
  };

  // Calculate offer expiry time
  const calculateOfferExpiry = (urgency) => {
    const now = new Date();
    const hours = urgency === 'expired' ? 4 :
                 urgency === 'today' ? 8 :
                 urgency === 'tomorrow' ? 24 : 48;

    now.setHours(now.getHours() + hours);
    return now.toISOString();
  };

  // Generate marketing templates
  const generateOfferTemplates = (items) => {
    const templates = [];

    // Group by location
    const locationGroups = {};
    items.forEach(item => {
      if (!locationGroups[item.location]) {
        locationGroups[item.location] = [];
      }
      locationGroups[item.location].push(item);
    });

    Object.entries(locationGroups).forEach(([location, locationItems]) => {
      // WhatsApp Template
      templates.push({
        channel: 'whatsapp',
        location,
        title: 'WhatsApp Broadcast',
        message: generateWhatsAppMessage(location, locationItems),
        icon: MessageSquare
      });

      // Instagram Story
      templates.push({
        channel: 'instagram',
        location,
        title: 'Instagram Story',
        message: generateInstagramStory(location, locationItems),
        icon: Instagram
      });

      // In-Store Board
      templates.push({
        channel: 'instore',
        location,
        title: 'Store Display Board',
        message: generateStoreBoardMessage(location, locationItems),
        icon: Megaphone
      });
    });

    setOfferTemplates(templates);
  };

  // Generate WhatsApp message
  const generateWhatsAppMessage = (location, items) => {
    const header = `🍛 *${location} - TODAY'S SPECIAL OFFERS!* 🍛\n\n`;

    let body = '';
    items.slice(0, 5).forEach(item => {
      const discount = discountTiers[item.urgency]?.discount || 25;
      const emoji = item.urgency === 'expired' ? '🚨' :
                   item.urgency === 'today' ? '⏰' : '💰';

      body += `${emoji} *${item.dishName}*\n`;
      body += `   Was £8 → Now *£${(8 * (1 - discount/100)).toFixed(2)}*\n`;
      body += `   ${item.portions} portions available\n\n`;
    });

    const footer = `📍 ${location}\n`;
    const cta = `📱 *Order Now:* Reply with dish name\n`;
    const timing = `⏰ *Valid until:* 9 PM Today\n`;
    const delivery = `🚚 *Free delivery* on orders above £30`;

    return header + body + footer + cta + timing + delivery;
  };

  // Generate Instagram story content
  const generateInstagramStory = (location, items) => {
    const topItem = items[0];
    const discount = discountTiers[topItem.urgency]?.discount || 25;

    return `📸 STORY CONTENT:\n\n` +
           `🎯 HEADLINE:\n${discount}% OFF TODAY!\n\n` +
           `🍛 FEATURED:\n${topItem.dishName}\n\n` +
           `💰 PRICE:\nWas £8 → Now £${(8 * (1 - discount/100)).toFixed(2)}\n\n` +
           `📍 LOCATION:\n${location}\n\n` +
           `#FoodDeals #${location.replace(' ', '')} #LimitedOffer #AuthenticFlavors`;
  };

  // Generate store board message
  const generateStoreBoardMessage = (location, items) => {
    let board = `╔════════════════════════════╗\n`;
    board += `║   TODAY'S SPECIAL OFFERS   ║\n`;
    board += `╚════════════════════════════╝\n\n`;

    items.slice(0, 4).forEach(item => {
      const discount = discountTiers[item.urgency]?.discount || 25;
      board += `▶ ${item.dishName}\n`;
      board += `  £${(8 * (1 - discount/100)).toFixed(2)} (Save ${discount}%)\n\n`;
    });

    board += `✓ Made Fresh Yesterday\n`;
    board += `✓ Limited Quantities\n`;
    board += `✓ While Stocks Last`;

    return board;
  };

  // Copy text to clipboard
  const copyToClipboard = (text, channel) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${channel} message copied to clipboard!`);
  };

  // Activate an offer
  const handleActivateOffer = (offer) => {
    const updated = generatedOffers.map(o =>
      o.id === offer.id ? { ...o, status: 'active' } : o
    );
    setGeneratedOffers(updated);
    setActiveOffers([...activeOffers, offer]);

    // Callback to parent
    if (onCreateOffer) {
      onCreateOffer(offer);
    }

    alert(`✅ Offer activated for ${offer.dishName} at ${offer.location}!`);
  };

  // Send notification
  const handleSendNotification = (template) => {
    if (onSendNotification) {
      onSendNotification(template);
    }
    alert(`📤 ${template.channel} notification sent for ${template.location}!`);
  };

  // Auto-refresh every 10 minutes
  useEffect(() => {
    calculateOldStock();
    const interval = setInterval(calculateOldStock, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [sales, dispatch, prepLog, offerStrategy]);

  // Filter items
  const filteredItems = oldStockItems.filter(item =>
    selectedLocation === 'all' || item.location === selectedLocation
  );

  // Calculate summary stats
  const stats = {
    totalOldStock: filteredItems.reduce((sum, item) => sum + item.portions, 0),
    totalValue: filteredItems.reduce((sum, item) => sum + (item.totalValue || 0), 0),
    criticalItems: filteredItems.filter(item =>
      item.urgency === 'expired' || item.urgency === 'today'
    ).length,
    locationsAffected: [...new Set(filteredItems.map(item => item.location))].length,
    potentialRevenue: filteredItems.reduce((sum, item) => {
      const discount = discountTiers[item.urgency]?.discount || 25;
      return sum + (item.portions * 8 * (1 - discount/100));
    }, 0)
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center">
          <Tag className="mr-2 text-orange-500" />
          Old Stock Offers Manager - Maximize Revenue
        </h2>
        <button
          onClick={calculateOldStock}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh Offers
        </button>
      </div>

      {/* Critical Alert */}
      {stats.criticalItems > 0 && (
        <div className="bg-red-50 border-2 border-red-400 rounded-lg p-4 mb-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="text-red-600 mr-3" size={28} />
              <div>
                <h3 className="text-lg font-bold text-red-800">
                  ⚠️ URGENT: {stats.criticalItems} items need immediate offers!
                </h3>
                <p className="text-red-700 text-sm">
                  Create and push offers NOW to avoid waste. Potential revenue: £{stats.potentialRevenue.toFixed(2)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOfferStrategy('automatic')}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <Zap size={16} className="inline mr-2" />
              Auto-Generate All Offers
            </button>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Old Stock</div>
          <div className="text-2xl font-bold text-orange-600">{stats.totalOldStock}p</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Critical Items</div>
          <div className="text-2xl font-bold text-red-600">{stats.criticalItems}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Original Value</div>
          <div className="text-2xl font-bold text-blue-600">£{stats.totalValue.toFixed(0)}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Potential Revenue</div>
          <div className="text-2xl font-bold text-green-600">£{stats.potentialRevenue.toFixed(0)}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-gray-600">Avg Discount</div>
          <div className="text-2xl font-bold text-purple-600">
            {stats.totalOldStock > 0 ?
              Math.round(((stats.totalValue - stats.potentialRevenue) / stats.totalValue) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border rounded"
            >
              <option value="all">All Locations</option>
              <option value="Eastham">Eastham</option>
              <option value="Bethnal Green">Bethnal Green</option>
              <option value="Central Kitchen">Central Kitchen</option>
            </select>

            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Strategy:</label>
              <select
                value={offerStrategy}
                onChange={(e) => setOfferStrategy(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
                <option value="aggressive">Aggressive (Higher Discounts)</option>
                <option value="conservative">Conservative (Lower Discounts)</option>
              </select>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Auto-refresh in: <span className="font-mono">10:00</span>
          </div>
        </div>
      </div>

      {/* Generated Offers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Automatic Offers */}
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b bg-gradient-to-r from-orange-50 to-yellow-50">
            <h3 className="text-lg font-semibold flex items-center">
              <Zap className="mr-2 text-orange-500" size={20} />
              Auto-Generated Offers ({generatedOffers.length})
            </h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {generatedOffers.length > 0 ? (
              <div className="space-y-3">
                {generatedOffers.map(offer => (
                  <div key={offer.id} className={`border rounded-lg p-3 ${
                    offer.status === 'active' ? 'bg-green-50 border-green-300' :
                    'bg-gray-50 border-gray-300'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold">{offer.dishName}</h4>
                        <div className="text-sm text-gray-600">
                          📍 {offer.location} | {offer.portions}p available
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold text-white bg-${
                        offer.tier.color
                      }-500`}>
                        {offer.discount}% OFF
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      <div className="font-medium">{offer.headline}</div>
                      <div className="text-gray-600">{offer.description}</div>
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-green-600 font-bold">
                          £{offer.offerPrice}
                          <span className="text-gray-500 line-through ml-2">
                            £{offer.originalPrice}
                          </span>
                        </div>
                        {offer.offerType === 'bundle' && (
                          <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            {offer.bundleSize} for £{offer.bundlePrice}
                          </div>
                        )}
                      </div>
                    </div>

                    {offer.status !== 'active' && (
                      <button
                        onClick={() => handleActivateOffer(offer)}
                        className="mt-3 w-full px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
                      >
                        <CheckCircle size={14} className="inline mr-1" />
                        Activate Offer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Tag size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No offers generated yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Click "Auto-Generate All Offers" to create offers
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Marketing Templates */}
        <div className="bg-white border rounded-lg">
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="text-lg font-semibold flex items-center">
              <Share2 className="mr-2 text-blue-500" size={20} />
              Marketing Templates ({offerTemplates.length})
            </h3>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            {offerTemplates.length > 0 ? (
              <div className="space-y-3">
                {offerTemplates.map((template, index) => {
                  const Icon = template.icon;
                  const channelConfig = marketingChannels.find(c => c.id === template.channel);

                  return (
                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon size={20} className={`text-${channelConfig?.color || 'gray'}-500`} />
                          <span className="font-medium">{template.title}</span>
                        </div>
                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                          {template.location}
                        </span>
                      </div>

                      <div className="bg-white p-2 rounded text-xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {template.message}
                      </div>

                      <div className="flex space-x-2 mt-3">
                        <button
                          onClick={() => copyToClipboard(template.message, template.title)}
                          className="flex-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          <Copy size={14} className="inline mr-1" />
                          Copy
                        </button>
                        <button
                          onClick={() => handleSendNotification(template)}
                          className="flex-1 px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          <Send size={14} className="inline mr-1" />
                          Send
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="text-gray-600">No templates generated</p>
                <p className="text-sm text-gray-500 mt-1">
                  Templates will appear when offers are created
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Old Stock Details Table */}
      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Old Stock Inventory Details</h3>
        </div>
        <div className="overflow-x-auto">
          {filteredItems.length > 0 ? (
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Urgency</th>
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-center">Portions</th>
                  <th className="px-4 py-2 text-center">Age</th>
                  <th className="px-4 py-2 text-center">Value</th>
                  <th className="px-4 py-2 text-center">Suggested Offer</th>
                  <th className="px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map((item, index) => {
                  const tier = discountTiers[item.urgency] || discountTiers.oldStock;
                  const offerPrice = 8 * (1 - tier.discount / 100);

                  return (
                    <tr key={index} className={
                      item.urgency === 'expired' ? 'bg-red-50' :
                      item.urgency === 'today' ? 'bg-orange-50' :
                      item.urgency === 'tomorrow' ? 'bg-yellow-50' :
                      'bg-white'
                    }>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold text-white bg-${tier.color}-500`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-medium">{item.dishName}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center">
                          <MapPin size={14} className="mr-1 text-gray-500" />
                          {item.location}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center font-bold">{item.portions}p</td>
                      <td className="px-4 py-2 text-center">
                        {item.avgAge !== undefined ? `${item.avgAge}d` :
                         item.hoursUntilExpiry ? `${Math.floor(item.hoursUntilExpiry)}h` : '-'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        £{(item.totalValue || item.portions * 8).toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="text-green-600 font-bold">
                          £{offerPrice.toFixed(2)}
                          <span className="text-xs text-gray-500 block">
                            Save {tier.discount}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        {generatedOffers.find(o =>
                          o.dishName === item.dishName &&
                          o.location === item.location &&
                          o.status === 'active'
                        ) ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Offer Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center">
              <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Old Stock!</h3>
              <p className="text-gray-500">Excellent inventory management - all stock is fresh!</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Summary */}
      <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-lg p-6">
        <h3 className="text-lg font-bold text-orange-800 mb-4">
          📋 Quick Action Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-red-700 mb-2">🚨 Immediate (Next 2 Hours)</h4>
            <ul className="text-sm space-y-1">
              <li>• Push {stats.criticalItems} critical offers</li>
              <li>• Send WhatsApp broadcasts</li>
              <li>• Update store boards</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-orange-700 mb-2">📱 Marketing Channels</h4>
            <ul className="text-sm space-y-1">
              <li>• WhatsApp: Ready to send</li>
              <li>• Instagram: Post stories now</li>
              <li>• In-store: Update displays</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-green-700 mb-2">💰 Revenue Target</h4>
            <ul className="text-sm space-y-1">
              <li>• Potential: £{stats.potentialRevenue.toFixed(0)}</li>
              <li>• Target: 80% sale rate</li>
              <li>• Expected: £{(stats.potentialRevenue * 0.8).toFixed(0)}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OldStockOffersManager;
