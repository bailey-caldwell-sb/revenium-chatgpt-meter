// openai-api.js - OpenAI API integration for usage metrics

/**
 * OpenAI API client for fetching usage and billing data
 */
class OpenAIAPIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
  }

  /**
   * Make authenticated request to OpenAI API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error?.message || `API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[OpenAI API] Request failed:', error);
      throw error;
    }
  }

  /**
   * Get usage data for a date range
   * @param {string} startDate - YYYY-MM-DD format
   * @param {string} endDate - YYYY-MM-DD format
   */
  async getUsage(startDate, endDate) {
    const endpoint = `/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`;
    return await this.request(endpoint);
  }

  /**
   * Get subscription and billing information
   */
  async getBillingSubscription() {
    return await this.request('/dashboard/billing/subscription');
  }

  /**
   * Validate API key
   */
  async validateKey() {
    try {
      // Try to list models as a simple validation
      await this.request('/models');
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get current month's usage summary
   */
  async getCurrentMonthUsage() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = lastDay.toISOString().split('T')[0];

    const [usage, subscription] = await Promise.all([
      this.getUsage(startDate, endDate),
      this.getBillingSubscription().catch(() => null)
    ]);

    return {
      usage,
      subscription,
      period: {
        start: startDate,
        end: endDate
      }
    };
  }

  /**
   * Get daily usage breakdown
   */
  async getDailyUsage(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    return await this.getUsage(start, end);
  }
}

/**
 * Parse usage data into simplified format
 */
function parseUsageData(usageResponse) {
  if (!usageResponse || !usageResponse.daily_costs) {
    return null;
  }

  let totalCost = 0;
  let totalRequests = 0;
  const dailyData = [];

  for (const day of usageResponse.daily_costs) {
    const dayCost = day.line_items.reduce((sum, item) => sum + item.cost, 0);
    const dayRequests = day.line_items.reduce((sum, item) => sum + (item.n_requests || 0), 0);

    totalCost += dayCost;
    totalRequests += dayRequests;

    dailyData.push({
      date: new Date(day.timestamp * 1000),
      cost: dayCost / 100, // Convert cents to dollars
      requests: dayRequests
    });
  }

  return {
    totalCost: totalCost / 100, // Convert cents to dollars
    totalRequests,
    dailyData,
    startDate: usageResponse.daily_costs[0]?.timestamp,
    endDate: usageResponse.daily_costs[usageResponse.daily_costs.length - 1]?.timestamp
  };
}

/**
 * Calculate usage statistics
 */
function calculateStats(parsedData) {
  if (!parsedData || !parsedData.dailyData.length) {
    return null;
  }

  const { dailyData, totalCost, totalRequests } = parsedData;
  const avgDailyCost = totalCost / dailyData.length;
  const avgDailyRequests = Math.round(totalRequests / dailyData.length);

  // Find peak day
  const peakDay = dailyData.reduce((max, day) =>
    day.cost > max.cost ? day : max
  );

  // Calculate trend (simple linear regression slope)
  const n = dailyData.length;
  const sumX = dailyData.reduce((sum, _, i) => sum + i, 0);
  const sumY = dailyData.reduce((sum, day) => sum + day.cost, 0);
  const sumXY = dailyData.reduce((sum, day, i) => sum + (i * day.cost), 0);
  const sumX2 = dailyData.reduce((sum, _, i) => sum + (i * i), 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const trend = slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';

  return {
    avgDailyCost,
    avgDailyRequests,
    peakDay: {
      date: peakDay.date,
      cost: peakDay.cost,
      requests: peakDay.requests
    },
    trend,
    trendValue: slope
  };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OpenAIAPIClient, parseUsageData, calculateStats };
}
