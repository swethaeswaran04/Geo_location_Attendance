const computeInsights = require("../utils/computeInsights");

// Worker: own insights  |  Admin calling with no userId: own insights
const getUserInsights = async (req, res) => {
  try {
    const { from, to } = req.query;
    const insights = await computeInsights(req.user._id, { from, to });

    if (!insights.length) {
      return res.json({
        message: "No attendance records found for this period.",
        insights: null,
      });
    }

    res.json({ insights: insights[0] });
  } catch (err) {
    res.status(500).json({ message: "Failed to compute insights", error: err.message });
  }
};

// Admin: all users' insights, sorted by performanceScore desc
const getAllInsights = async (req, res) => {
  try {
    const { from, to, sort = "performanceScore", order = "desc" } = req.query;
    const insights = await computeInsights(null, { from, to });

    insights.sort((a, b) =>
      order === "asc" ? a[sort] - b[sort] : b[sort] - a[sort]
    );

    const summary = {
      totalWorkers:       insights.length,
      avgPerformance:     insights.length
        ? Math.round(insights.reduce((s, i) => s + i.performanceScore, 0) / insights.length)
        : 0,
      topPerformer:       insights[0]?.user?.name ?? null,
      gradeDistribution:  insights.reduce((acc, i) => {
        acc[i.grade] = (acc[i.grade] || 0) + 1;
        return acc;
      }, {}),
    };

    res.json({ summary, insights });
  } catch (err) {
    res.status(500).json({ message: "Failed to compute insights", error: err.message });
  }
};

module.exports = { getUserInsights, getAllInsights };
