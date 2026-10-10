const $ = (id) => document.getElementById(id);

const subjectInput = $("subject");
const syllabusInput = $("syllabus");
const questionsInput = $("questions");
const yearInput = $("paperYear");
const syllabusFileInput = $("syllabusFile");
const paperFileInput = $("paperFiles");
const notesFileInput = $("notesFiles");

if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

async function extractTextFromPDF(file) {
    if (!window.pdfjsLib) {
        throw new Error("PDF reader library load nahi hui. Internet connection check karo.");
    }

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";

    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();

        text += content.items.map(item => item.str).join(" ") + "\n";
    }

    return text;
}

async function extractTextFromImage(file) {
    if (!window.Tesseract) {
        throw new Error("Image reader library load nahi hui. Internet connection check karo.");
    }

    const result = await Tesseract.recognize(file, "eng");
    return result.data.text || "";
}

async function extractTextFromFile(file) {
    const name = file.name.toLowerCase();

    if (name.endsWith(".pdf")) {
        return extractTextFromPDF(file);
    }

    if (/\.(png|jpe?g)$/i.test(name)) {
        return extractTextFromImage(file);
    }

    throw new Error(`Unsupported file: ${file.name}`);
}

async function extractTextFromFiles(fileInput) {
    const files = [...(fileInput?.files || [])];
    const parts = [];

    for (const file of files) {
        showMessage(`Reading ${file.name}...`, "success");

        const text = await extractTextFromFile(file);

        if (text.trim()) {
            parts.push(text.trim());
        } else {
            parts.push("");
        }
    }

    return parts.join("\n\n");
}

const demoQuestions = [
    "Explain the working principle of a PN junction diode. (5 marks)",
    "Draw and explain the V-I characteristics of a diode. (5 marks)",
    "State and prove the properties of matrices. (5 marks)",
    "Solve the differential equation using the appropriate method. (5 marks)",
    "Explain the process of corrosion and its prevention. (5 marks)",
    "Calculate the hardness of water using the given data. (5 marks)",
    "Explain the working of a four-stroke engine with a neat diagram. (5 marks)",
    "Differentiate between stress and strain. (3 marks)",
    "Write a formal letter to the head of your department. (5 marks)",
    "Explain the barriers to effective communication. (3 marks)",
    "Explain the stages of the design thinking process. (5 marks)",
    "Differentiate between empathy and ideation in design thinking. (3 marks)"
];

const demoTopics = [
    "PN Junction Diode",
    "Diode Characteristics",
    "Matrices",
    "Differential Equations",
    "Corrosion",
    "Water Hardness",
    "Four-Stroke Engine",
    "Stress and Strain",
    "Formal Letter Writing",
    "Communication Barriers",
    "Design Thinking Process",
    "Empathy and Ideation"
];

const stopWords = new Set([
    "the", "and", "for", "with", "from", "into", "using",
    "what", "when", "where", "which", "who", "why", "how",
    "explain", "describe", "discuss", "define", "write",
    "draw", "show", "state", "give", "derive", "prove",
    "calculate", "find", "solve", "compare", "differentiate",
    "between", "following", "following", "above", "below",
    "your", "their", "this", "that", "these", "those",
    "its", "are", "was", "were", "has", "have", "had",
    "can", "could", "would", "should", "shall", "will",
    "into", "onto", "about", "also", "each", "any",
    "all", "not", "per", "marks", "mark", "question",
    "questions", "short", "long", "answer", "answers"
]);

const synonyms = {
    "pn junction diode": ["pn diode", "junction diode"],
    "diode characteristics": ["vi characteristics", "v-i characteristics", "characteristics of diode"],
    "differential equations": ["differential equation", "ode"],
    "matrices": ["matrix", "determinant", "determinants"],
    "water hardness": ["hardness of water", "hard water"],
    "corrosion": ["rusting", "corrosion prevention"],
    "four-stroke engine": ["four stroke engine", "4 stroke engine", "four-stroke cycle"],
    "stress and strain": ["stress", "strain", "stress strain"],
    "formal letter writing": ["formal letter", "letter writing", "official letter"],
    "communication barriers": ["barriers to communication", "barriers to effective communication"],
    "design thinking process": ["design thinking", "stages of design thinking", "design process"],
    "empathy and ideation": ["empathy", "ideation"]
};

const typePatterns = [
    {
        name: "Numerical",
        pattern: /\b(calculate|find the value|solve|compute|evaluate numerically|determine the value|numerical|given data|calculate the)\b/i
    },
    {
        name: "Derivation / Proof",
        pattern: /\b(derive|prove|proof|deduce|show that)\b/i
    },
    {
        name: "Diagram / Construction",
        pattern: /\b(draw|sketch|construct|neat diagram|circuit diagram|block diagram|flowchart)\b/i
    },
    {
        name: "Comparison",
        pattern: /\b(differentiate|distinguish|compare|difference between|differentiate between)\b/i
    },
    {
        name: "Theory",
        pattern: /\b(explain|describe|discuss|define|state|write|what is|list|mention|working principle)\b/i
    }
];

function showMessage(message, type = "error") {
    const box = $("message");
    box.textContent = message;
    box.className = `message ${type}`;
    box.hidden = false;
}

function clearMessage() {
    $("message").hidden = true;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function normalize(text) {
    return String(text)
        .toLowerCase()
        .replace(/[–—]/g, "-")
        .replace(/[^a-z0-9+#.\s-]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getKeywords(topic) {
    return normalize(topic)
        .split(/[\s-]+/)
        .filter(word => word.length > 1 && !stopWords.has(word));
}

function countPhrase(text, phrase) {
    const escaped = normalize(phrase)
        .split(" ")
        .filter(Boolean)
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+");

    if (!escaped) return 0;

    const regex = new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "gi");
    return [...text.matchAll(regex)].length;
}

function topicMatchScore(question, topic) {
    const q = normalize(question);
    const t = normalize(topic);

    if (!q || !t) return 0;

    let best = 0;

    // Exact topic phrase is the strongest match.
    if (countPhrase(q, t) > 0) best = 1;

    // Known subject-topic aliases.
    const aliases = synonyms[t] || [];
    for (const alias of aliases) {
        if (countPhrase(q, alias) > 0) best = Math.max(best, 0.95);
    }

    // Partial keyword matching helps with differently worded questions.
    const keywords = getKeywords(topic);
    if (keywords.length) {
        const matched = keywords.filter(word => countPhrase(q, word) > 0).length;
        const overlap = matched / keywords.length;

        if (keywords.length === 1 && matched === 1) {
            best = Math.max(best, 0.62);
        } else if (overlap >= 0.75) {
            best = Math.max(best, 0.82);
        } else if (overlap >= 0.5 && matched >= 2) {
            best = Math.max(best, 0.65);
        }
    }

    return best;
}

function extractQuestions(rawText) {
    return rawText
        .split(/\n|(?<=\?)\s+(?=[A-Z])/)
        .map(line => line.trim())
        .filter(line => line.length >= 5)
        .filter(line => !/^(section|part)\s+[a-z0-9]+/i.test(line));
}

function extractMarks(question) {
    const patterns = [
        /\(\s*(\d{1,2})\s*marks?\s*\)/i,
        /\[\s*(\d{1,2})\s*marks?\s*\]/i,
        /\b(\d{1,2})\s*marks?\b/i,
        /\b(\d{1,2})\s*pts?\b/i
    ];

    for (const pattern of patterns) {
        const match = question.match(pattern);
        if (match) {
            const value = Number(match[1]);
            if (value >= 1 && value <= 30) return value;
        }
    }

    return null;
}

function classifyType(question) {
    for (const item of typePatterns) {
        if (item.pattern.test(question)) return item.name;
    }

    return "Unclassified";
}

function classifyDifficulty(question, marks) {
    const q = question.toLowerCase();

    if (
        /\b(prove|derive|in detail|multi-step|complex|justify|analyze|analyse)\b/i.test(q) ||
        (marks !== null && marks >= 8)
    ) {
        return "Hard";
    }

    if (
        /\b(calculate|solve|compare|differentiate|explain|describe|evaluate)\b/i.test(q) ||
        (marks !== null && marks >= 4)
    ) {
        return "Medium";
    }

    return "Easy";
}

function parseSyllabus() {
    return [...new Set(
        syllabusInput.value
            .split(/\n|,|;/)
            .map(topic => topic.trim())
            .filter(topic => topic.length >= 2)
    )];
}
async function analyze() {
    clearMessage();

    try {
        const subject = subjectInput.value.trim();

        if (!subject) {
            showMessage("Please enter a subject name.");
            subjectInput.focus();
            return;
        }

        // Read uploaded syllabus files
        let uploadedSyllabus = "";
        if (syllabusFileInput?.files?.length) {
            uploadedSyllabus = await extractTextFromFiles(syllabusFileInput);
        }

     const paperEntries = [];

if (paperFileInput?.files?.length) {
    for (const file of paperFileInput.files) {
        showMessage(`Reading ${file.name}...`, "success");

        const text = await extractTextFromFile(file);
        const match = file.name.match(/\b(20\d{2})\b/);
        const year = match
            ? Number(match[1])
            : (Number(yearInput.value) || new Date().getFullYear());

        const questions = extractQuestions(text);

        for (const question of questions) {
            paperEntries.push({ question, year });
        }
    }
}
        let uploadedNotes = "";
if (notesFileInput?.files?.length) {
    uploadedNotes = await extractTextFromFiles(notesFileInput);
}

        // Combine typed text with extracted file text
        const syllabusText = [
            syllabusInput.value.trim(),
            uploadedSyllabus.trim()
        ].filter(Boolean).join("\n");

const typedQuestions = extractQuestions(questionsInput.value);
const defaultYear =
    Number(yearInput.value) || new Date().getFullYear();

for (const question of typedQuestions) {
    paperEntries.push({
        question,
        year: defaultYear
    });
}

const rawQuestions = paperEntries.map(entry => entry.question);

const topics = [...new Set(
    syllabusText
        .split(/\n|,|;/)
        .map(topic => topic.trim())
        .filter(Boolean)
)];

        if (!topics.length) {
            showMessage("Please type or upload your syllabus topics.");
            syllabusInput.focus();
            return;
        }

        if (!rawQuestions.length) {
            showMessage("Please type or upload at least one question.");
            questionsInput.focus();
            return;
        }

        const paperYear = Number(yearInput.value) || new Date().getFullYear();

        const results = topics.map(topic => ({
            topic,
            questions: [],
            marks: 0,
            knownMarks: 0,
            types: new Set(),
            difficulties: [],
            years: new Set()
        }));

        const unmatched = [];
        let totalMarks = 0;
        let questionsWithMarks = 0;

        for (const entry of paperEntries) {
    const originalQuestion = entry.question;
    const paperYear = entry.year;

    const marks = extractMarks(originalQuestion);
    const type = classifyType(originalQuestion);
    const difficulty = classifyDifficulty(originalQuestion, marks);

    const scored = results
        .map(item => ({
            item,
            score: topicMatchScore(originalQuestion, item.topic)
        }))
        .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const second = scored[1];

    if (
        !best ||
        best.score < 0.62 ||
        (second && best.score - second.score < 0.12)
    ) {
        unmatched.push(originalQuestion);
        continue;
    }

    const item = best.item;

    item.questions.push({
        text: originalQuestion,
        marks,
        type,
        difficulty,
        year: paperYear,
        matchScore: best.score
    });

    item.types.add(type);
    item.difficulties.push(difficulty);
    item.years.add(paperYear);

    if (marks !== null) {
        item.marks += marks;
        item.knownMarks += 1;
        totalMarks += marks;
        questionsWithMarks += 1;
    }
}

        const matchedCount = results.reduce(
            (sum, item) => sum + item.questions.length, 0
        );

        if (matchedCount === 0) {
            showMessage(
                "No questions matched confidently. Check the syllabus topics and question text."
            );
            $("results").hidden = true;
            return;
        }

        const maxFrequency = Math.max(
            ...results.map(item => item.questions.length), 1
        );

        const maxMarks = Math.max(
            ...results.map(item => item.marks), 1
        );

        const ranked = results.map(item => {
            const frequency = item.questions.length;
            const frequencyScore = frequency / maxFrequency;
            const marksScore = item.marks / maxMarks;
            const score = (frequencyScore * 0.7) + (marksScore * 0.3);

            const confidence = Math.round(
                45 +
                (Math.min(frequency, 5) * 7) +
                (frequency > 0 ? 10 : 0)
            );

            let priority = "Low";

            if (frequency > 0 && score >= 0.65) {
                priority = "High";
            } else if (frequency > 0 && score >= 0.3) {
                priority = "Medium";
            }

            const reason = frequency === 0
                ? "No confidently matched questions in the supplied text. This does not mean the topic is unimportant."
                : `${frequency} matched question(s) in the supplied paper. Recorded marks: ${item.marks}. Priority is based on observed frequency and stated marks.`;

            return {
                ...item,
                score,
                confidence: Math.min(confidence, 90),
                priority,
                reason
            };
        }).sort(
            (a, b) => b.score - a.score ||
                b.questions.length - a.questions.length
        );

        renderResults({
            subject,
            paperYear,
            topics,
            ranked,
            unmatched,
            rawQuestions,
            matchedCount,
            totalMarks,
            questionsWithMarks
        });

        clearMessage();

    } catch (error) {
        console.error("Analysis error:", error);
        showMessage(
            error.message || "Could not read the uploaded files. Try again or paste the text manually."
        );
    }
}

function renderResults(data) {
    $("results").hidden = false;

    $("resultsTitle").textContent = `${data.subject} — Study Priority Report`;
    $("resultsSubtitle").textContent =
        `Analysis of ${data.rawQuestions.length} question entries from the ${data.paperYear} paper input.`;

    $("totalQuestions").textContent = data.rawQuestions.length;
    $("topicsIdentified").textContent = data.ranked.filter(
        item => item.questions.length > 0
    ).length;
    $("highPriority").textContent = data.ranked.filter(
        item => item.priority === "High"
    ).length;
    $("totalMarks").textContent = data.totalMarks;

    renderFrequency(data.ranked);
    renderYearlyTrends(data.ranked);
    renderTypes(data.ranked);
    renderDifficulties(data.ranked);
    renderTable(data.ranked);
    renderRevisionPlan(data.ranked);

    const unmatchedSection = $("unmatchedSection");
    const unmatchedList = $("unmatchedQuestions");

    unmatchedSection.hidden = data.unmatched.length === 0;
    unmatchedList.innerHTML = data.unmatched
        .map(question => `<li>${escapeHTML(question)}</li>`)
        .join("");

    showMessage(
        `Analysis complete: ${data.ranked.filter(item => item.questions.length > 0).length} topics matched, ${data.unmatched.length} question(s) left unmatched. This is a rule-based estimate, not a prediction guarantee.`,
        "success"
    );

    $("results").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderFrequency(ranked) {
    const sorted = [...ranked]
        .sort((a, b) => b.questions.length - a.questions.length)
        .slice(0, 10);

    const max = Math.max(...sorted.map(item => item.questions.length), 1);

    $("frequencyChart").innerHTML = sorted.map(item => {
        const count = item.questions.length;
        const width = count === 0 ? 0 : Math.max(5, (count / max) * 100);

        return `
            <div class="bar-item">
                <div class="bar-label-row">
                    <span class="bar-label">${escapeHTML(item.topic)}</span>
                    <span>${count} question(s)</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${width}%"></div>
                </div>
            </div>
        `;
    }).join("");
}
function renderYearlyTrends(ranked) {
    const container = $("yearlyTrends");

    if (!container) return;

    const years = [...new Set(
        ranked.flatMap(item =>
            item.questions.map(question => question.year)
        ).filter(year => year)
    )].sort((a, b) => a - b);

    if (years.length === 0) {
        container.innerHTML =
            "<p>No year-wise data available. Upload papers with years in their filenames, e.g. 2024_Endsem.pdf.</p>";
        return;
    }

    const topics = ranked
        .filter(item => item.questions.length > 0)
        .sort((a, b) => b.questions.length - a.questions.length)
        .slice(0, 10);

    container.innerHTML = `
        <div class="yearly-table-wrapper">
            <table class="yearly-table">
                <thead>
                    <tr>
                        <th>Topic</th>
                        ${years.map(year => `<th>${year}</th>`).join("")}
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${topics.map(item => `
                        <tr>
                            <td>${escapeHTML(item.topic)}</td>
                            ${years.map(year => {
                                const count = item.questions.filter(
                                    question => Number(question.year) === Number(year)
                                ).length;
                                return `<td>${count}</td>`;
                            }).join("")}
                            <td><strong>${item.questions.length}</strong></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}
function renderTypes(ranked) {
    const counts = new Map();

    for (const item of ranked) {
        for (const question of item.questions) {
            counts.set(question.type, (counts.get(question.type) || 0) + 1);
        }
    }

    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);

    $("typeDistribution").innerHTML = entries.length
        ? entries.map(([type, count]) => `
            <div class="distribution-item">
                <span class="distribution-label">
                    <span class="distribution-dot"></span>
                    ${escapeHTML(type)}
                </span>
                <strong>${count}</strong>
            </div>
        `).join("")
        : "<p>No question types identified.</p>";
}

function renderDifficulties(ranked) {
    const counts = { Easy: 0, Medium: 0, Hard: 0 };

    for (const item of ranked) {
        for (const difficulty of item.difficulties) {
            counts[difficulty]++;
        }
    }

    $("difficultyDistribution").innerHTML = Object.entries(counts)
        .map(([name, count]) => `
            <div class="difficulty-row">
                <span>${name}</span>
                <strong>${count}</strong>
            </div>
        `).join("");
}

function renderTable(ranked) {
    $("priorityTable").innerHTML = ranked.map((item, index) => {
        const types = [...item.types].join(", ") || "Not observed";
        const badgeClass = {
            High: "priority-high",
            Medium: "priority-medium",
            Low: "priority-low"
        }[item.priority];

        return `
            <tr>
                <td>
                    <span class="rank-number">#${index + 1}</span>
                    <span class="topic-name">${escapeHTML(item.topic)}</span>
                </td>
                <td>
                    <strong>${item.questions.length}</strong>
                    <br><span class="helper-text">${item.questions.length === 1 ? "question" : "questions"}</span>
                </td>
                <td>${escapeHTML(types)}</td>
                <td><span class="priority-badge ${badgeClass}">${item.priority}</span></td>
                <td>
                    <div class="confidence">
                        <span class="confidence-value">${item.confidence}%</span>
                        <div class="confidence-track">
                            <div class="confidence-fill" style="width:${item.confidence}%"></div>
                        </div>
                    </div>
                </td>
                <td class="reason-cell">${escapeHTML(item.reason)}</td>
            </tr>
        `;
    }).join("");
}

function renderRevisionPlan(ranked) {
    const activeTopics = ranked.filter(item => item.questions.length > 0);
    const inactiveTopics = ranked.filter(item => item.questions.length === 0);

    const plan = [
        ...activeTopics,
        ...inactiveTopics
    ];

    $("revisionPlan").innerHTML = plan.map((item, index) => {
        let action;

        if (item.priority === "High") {
            action = "Revise first. Practice questions from the supplied papers.";
        } else if (item.priority === "Medium") {
            action = "Review concepts and solve representative questions.";
        } else if (item.questions.length === 0) {
            action = "Review the syllabus and study material; past-paper frequency is unknown.";
        } else {
            action = "Revise after higher-ranked topics and check your understanding.";
        }

        return `
            <li>
                <strong>${escapeHTML(item.topic)}</strong> —
                ${escapeHTML(action)}
            </li>
        `;
    }).join("");
}

function loadDemo() {
    syllabusFileInput.value = "";
paperFileInput.value = "";
    subjectInput.value = "First Semester — Mixed Subject Demo";
    syllabusInput.value = demoTopics.join("\n");
    questionsInput.value = demoQuestions.join("\n");
    yearInput.value = "2025";

    clearMessage();
    analyze();
}

function resetApp() {
    syllabusFileInput.value = "";
paperFileInput.value = "";
    subjectInput.value = "";
    syllabusInput.value = "";
    questionsInput.value = "";
    $("results").hidden = true;
    clearMessage();
    subjectInput.focus();
}

$("analyzeBtn").addEventListener("click", analyze);
$("demoBtn").addEventListener("click", loadDemo);
$("resetBtn").addEventListener("click", resetApp);

console.log("ExamWise AI is ready.");