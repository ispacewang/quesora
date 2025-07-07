const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const db = require("./db"); // 确保这是引入的 better-sqlite3 实例
const { cut: jiebaCut } = require("@node-rs/jieba"); // 【新增】引入分词库

// --- 辅助函数区 ---

/**
 * 解析上传的Excel文件中的题目
 * @param {string} filePath - 文件路径
 * @returns {Array} - 解析后的题目对象数组
 */
function parseQuestions(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    return data.map((row) => {
      const originalType = row["题型"] || "";
      let determinedType = "单选题";
      if (originalType.includes("多选")) {
        determinedType = "多选题";
      } else if (originalType.includes("判断")) {
        determinedType = "判断题";
      } else if (originalType.includes("简答")) {
        determinedType = "简答题";
      }

      let opts = [];
      if (row["选项"]) {
        opts = row["选项"]
          .split(/\||｜/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (determinedType === "判断题") {
        opts = ["A. 正确", "B. 错误"];
      }

      let answer = (row["答案"] || "").toString().trim();
      switch (determinedType) {
        case "单选题":
        case "多选题":
          answer = answer.replace(/，/g, ",").replace(/\s+/g, "").toUpperCase();
          break;
      }

      const explanation = row["解析"] || row["说明"] || "";
      const meta = {
        一级纲要: row["一级纲要"] || "",
        二级纲要: row["二级纲要"] || "",
        题目分类: row["题目分类"] || "",
        题目依据: row["题目依据"] || "",
        试题分数: row["试题分数"] || "",
        试题编号: row["试题编号"] || "",
        备注: row["备注"] || "",
      };

      return {
        question: row["题干"] || "",
        options: JSON.stringify(opts), // 直接存JSON字符串
        answer: answer,
        explanation: explanation,
        type: determinedType,
        meta: JSON.stringify(meta), // 直接存JSON字符串
      };
    });
  } finally {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

// --- Express 服务器创建函数 ---
function createServer() {
  const app = express();
  const upload = multer({ dest: "uploads/" });
  app.use(cors());
  app.use(express.json());

  // --- 路由区 ---

  // 上传题库文件，写入数据库
  app.post("/upload", upload.single("file"), (req, res) => {
    const baseName = req.body.bankName || "未命名题库";
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${now.getDate().toString().padStart(2, "0")}_${now
      .getHours()
      .toString()
      .padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}${now
      .getSeconds()
      .toString()
      .padStart(2, "0")}`;
    const uniqueBankName = `${baseName}_${timestamp}`;

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      console.time("parseFile");
      const questions = parseQuestions(req.file.path);
      console.timeEnd("parseFile");

      const insertMany = db.transaction((bankName, questionsToInsert) => {
        const bankInfo = db
          .prepare("INSERT INTO banks (name) VALUES (?)")
          .run(bankName);
        const bankId = bankInfo.lastInsertRowid;
        const stmt = db.prepare(
          `INSERT INTO questions (bank_id, question, options, answer, explanation, type, meta) VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        for (const q of questionsToInsert) {
          stmt.run(
            bankId,
            q.question,
            q.options,
            q.answer,
            q.explanation,
            q.type,
            q.meta
          );
        }
        return { count: questionsToInsert.length };
      });

      console.time("dbWrite");
      const result = insertMany(uniqueBankName, questions);
      console.timeEnd("dbWrite");

      res.json({
        success: true,
        count: result.count,
        bankName: uniqueBankName,
      });
    } catch (e) {
      console.error("上传处理失败:", e);
      res.status(500).json({ error: "解析文件或写入数据库失败: " + e.message });
    }
  });

  // 获取题库列表
  app.get("/banks", (req, res) => {
    try {
      const stmt = db.prepare("SELECT name FROM banks");
      const rows = stmt.all();
      res.json({ banks: rows.map((r) => r.name) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  /**

     * 【新增】生成试卷接口

     * 根据题库名称，随机生成包含100道题的试卷（不含简答题）

     */

  app.get("/generate-paper", (req, res) => {
    const { bankName } = req.query;
    // 1. 参数校验
    if (!bankName) {
      return res.status(400).json({ error: "缺少题库名称 (bankName) 参数" });
    }
    try {
      // 2. 根据题库名称查找题库ID
      const bankRow = db
        .prepare("SELECT id FROM banks WHERE name = ?")
        .get(bankName);
      if (!bankRow) {
        return res.status(404).json({ error: "题库不存在" });
      }
      const bankId = bankRow.id;
      // 3. 从数据库中随机抽取100道非简答题的题目
      // 使用 ORDER BY RANDOM() LIMIT 100 是 SQLite 中高效的随机抽样方法
      const stmt = db.prepare(`
                SELECT id, question, options, type, meta, answer, explanation
                FROM questions
                WHERE bank_id = ? AND type IN ('单选题', '多选题', '判断题')
                ORDER BY RANDOM()
                LIMIT 100
            `);

      const questions = stmt.all(bankId);
      // 如果题库中符合条件的题目不足100道，将返回所有符合条件的题目
      if (questions.length === 0) {
        return res.status(404).json({ error: "该题库中没有符合条件的题目" });
      }
      // 4. 格式化题目数据，将JSON字符串解析为对象
      const formattedQuestions = questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
        type: q.type,
        meta: q.meta ? JSON.parse(q.meta) : {},
      }));
      // 5. 返回生成的试卷
      res.json(formattedQuestions);
    } catch (err) {
      console.error(`为题库 '${bankName}' 生成试卷时出错:`, err);
      res.status(500).json({ error: "服务器内部错误: " + err.message });
    }
  });

  // 获取随机题目
  app.get("/question", (req, res) => {
    const bankName = req.query.bankName;
    if (!bankName) return res.status(400).json({ error: "缺少题库名" });
    try {
      const bankRow = db
        .prepare("SELECT id FROM banks WHERE name=?")
        .get(bankName);
      if (!bankRow) return res.status(400).json({ error: "题库不存在" });
      const bankId = bankRow.id;
      const questions = db
        .prepare("SELECT * FROM questions WHERE bank_id=?")
        .all(bankId);
      if (!questions || questions.length === 0) {
        return res.status(400).json({ error: "题库为空" });
      }
      const idx = Math.floor(Math.random() * questions.length);
      const q = questions[idx];
      res.json({
        id: q.id, // 返回题目ID，方便后续操作
        question: q.question,
        options: JSON.parse(q.options),
        type: q.type,
        meta: q.meta ? JSON.parse(q.meta) : {},
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 判题并返回解读
  app.post("/answer", (req, res) => {
    const { id, userAnswer, bankName } = req.body; // 改为使用题目ID判题，更准确
    if (!bankName || id === undefined || userAnswer === undefined) {
      return res
        .status(400)
        .json({ error: "参数错误，需要 bankName, id, userAnswer" });
    }
    try {
      const q = db.prepare("SELECT * FROM questions WHERE id = ?").get(id);
      if (!q) {
        return res.status(404).json({ error: "题目不存在" });
      }

      let correct = false;
      switch (q.type) {
        case "多选题": {
          const stdArr = q.answer
            .replace(/,/g, "")
            .split("")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
            .sort();
          const usrArr = (Array.isArray(userAnswer) ? userAnswer : [userAnswer])
            .map((s) => String(s).trim().toUpperCase())
            .filter(Boolean)
            .sort();
          correct = JSON.stringify(stdArr) === JSON.stringify(usrArr);
          break;
        }
        case "判断题":
        case "单选题":
        default: {
          correct =
            q.answer.trim().toUpperCase() ===
            String(userAnswer).trim().toUpperCase();
          break;
        }
      }
      res.json({ correct, explanation: q.explanation, answer: q.answer });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 静态托管前端
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });

  return app;
}

module.exports = createServer;
