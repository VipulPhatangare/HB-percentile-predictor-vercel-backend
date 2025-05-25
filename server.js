const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Use environment variables
const SUPABASEURL = process.env.SUPABASE_URL;
const SUPABASEKEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASEURL, SUPABASEKEY);

// Helper function for Math Percentile
async function mathPercentile(marks, difficulty) {
    const allowedColumns = ['Easy', 'Medium', 'Hard'];
    if (!allowedColumns.includes(difficulty)) {
        throw new Error('Invalid difficulty level');
    }

    const { data: rows, error: queryError } = await supabase
        .from('math_marks_vs_percentile')
        .select(`Percentile, "${difficulty}"`);

    if (queryError) throw queryError;

    const upper = rows
        .filter(r => r[difficulty] >= Number(marks))
        .sort((a, b) => a[difficulty] - b[difficulty])[0];

    const lower = rows
        .filter(r => r[difficulty] < Number(marks))
        .sort((a, b) => b[difficulty] - a[difficulty])[0];

    let Percentile = 0;
    let crandint = (Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000) / 100000;

    if (!upper && lower) {
        Percentile = lower.Percentile;
    } else if (upper && !lower) {
        Percentile = 0;
    } else if (upper && lower) {
        Percentile = ((marks - lower[difficulty]) / (upper[difficulty] - lower[difficulty])) + lower.Percentile;
    }

    if ((Percentile + crandint) < 100) {
        Percentile += crandint;
    }

    return Percentile;
}

// Helper function for Physics/Chemistry Percentile
async function pcPercentile(marks, difficulty) {
    const allowedColumns = ['Easy', 'Medium', 'Hard'];
    if (!allowedColumns.includes(difficulty)) {
        throw new Error('Invalid difficulty level');
    }

    const { data: rows, error: queryError } = await supabase
        .from('pc_marks_vs_percentile')
        .select(`Percentile, "${difficulty}"`);

    if (queryError) throw queryError;

    const upper = rows
        .filter(r => r[difficulty] >= Number(marks))
        .sort((a, b) => a[difficulty] - b[difficulty])[0];

    const lower = rows
        .filter(r => r[difficulty] < Number(marks))
        .sort((a, b) => b[difficulty] - a[difficulty])[0];

    let Percentile = 0;
    let crandint = (Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000) / 100000;

    if (!upper && lower) {
        Percentile = lower.Percentile;
    } else if (upper && !lower) {
        Percentile = 0;
    } else if (upper && lower) {
        Percentile = ((marks - lower[difficulty]) / (upper[difficulty] - lower[difficulty])) + lower.Percentile;
    }

    if ((Percentile + crandint) < 100) {
        Percentile += crandint;
    }

    return Percentile;
}

// API Route
app.post('/api/calculate-percentile', async (req, res) => {
    const { mathMarks, physicsMarks, chemistryMarks, examDate, shift } = req.body;

    const marks = mathMarks + physicsMarks + chemistryMarks;
    const [year, month, day] = examDate.split("-");
    const formatDate = `${day}-${month}-${year}`;
    const newShift = `Shift_${shift}`;

    try {
        const { data, error } = await supabase
            .from('hb_difficulty_of_exam')
            .select(`${newShift}`)
            .eq('Date', formatDate)
            .maybeSingle();

        if (error || !data) {
            return res.status(500).json({ error: 'Failed to fetch difficulty' });
        }

        const difficulty = data[newShift];

        const { data: rows, error: queryError } = await supabase
            .from('marks_vs_percentile')
            .select(`Percentile, "${difficulty}"`);

        if (queryError) throw queryError;

        const upper = rows
            .filter(r => r[difficulty] >= Number(marks))
            .sort((a, b) => a[difficulty] - b[difficulty])[0];

        const lower = rows
            .filter(r => r[difficulty] < Number(marks))
            .sort((a, b) => b[difficulty] - a[difficulty])[0];

        let Percentile = 0;

        if (!upper && lower) {
            Percentile = lower.Percentile;
        } else if (upper && !lower) {
            Percentile = 0;
        } else if (upper && lower) {
            Percentile = ((marks - lower[difficulty]) / (upper[difficulty] - lower[difficulty])) + lower.Percentile;
        }

        const math_percentile = await mathPercentile(mathMarks, difficulty);
        const physics_percentile = await pcPercentile(physicsMarks, difficulty);
        const chemistry_percentile = await pcPercentile(chemistryMarks, difficulty);

        res.json({
            Percentile,
            math_percentile,
            physics_percentile,
            chemistry_percentile,
            marks
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
