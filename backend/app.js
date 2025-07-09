const express = require("express");
const multer = require("multer");
const xlsx = require("xlsx");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const db = require("./db"); // 确保这是引入的 better-sqlite3 实例
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
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const rawBuffer = Buffer.from(req.file.originalname, 'latin1');
    const decodedName = rawBuffer.toString('utf8');
    const originalFilename = decodedName; // 【重要】我们后续使用这个解码后的名字
    const bankName = path.basename(originalFilename, path.extname(originalFilename));

    // 如果文件名处理后为空（例如文件名是 ".txt"），则拒绝
    if (!bankName) {
      return res.status(400).json({ error: "无效的文件名，无法生成题库名" });
    }
    // 3. 【健壮性增强】检查题库是否已存在
    const existingBank = db
      .prepare("SELECT id FROM banks WHERE name = ?")
      .get(bankName);
    if (existingBank) {
      // 使用 409 Conflict 状态码，表示资源冲突
      return res.status(409).json({
        error: `题库 "${bankName}" 已存在。请使用其他文件名或先删除现有题库。`,
      });
    }
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
    const uniqueBankName = `${bankName}`;

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

     * 【修改】生成试卷接口
     * 单选40道，多选30道，判断30道
     */
  app.get("/generate-paper", (req, res) => {
    const { bankName } = req.query;
    if (!bankName) {
      return res.status(400).json({ error: "缺少题库名称 (bankName) 参数" });
    }
    try {
      const bankRow = db
        .prepare("SELECT id FROM banks WHERE name = ?")
        .get(bankName);
      if (!bankRow) {
        return res.status(404).json({ error: "题库不存在" });
      }
      const bankId = bankRow.id;
      // 分别抽取
      const single = db
        .prepare(
          `SELECT id, question, options, type, meta, answer, explanation FROM questions WHERE bank_id = ? AND type = '单选题' ORDER BY RANDOM() LIMIT 40`
        )
        .all(bankId);
      const multi = db
        .prepare(
          `SELECT id, question, options, type, meta, answer, explanation FROM questions WHERE bank_id = ? AND type = '多选题' ORDER BY RANDOM() LIMIT 30`
        )
        .all(bankId);
      const judge = db
        .prepare(
          `SELECT id, question, options, type, meta, answer, explanation FROM questions WHERE bank_id = ? AND type = '判断题' ORDER BY RANDOM() LIMIT 30`
        )
        .all(bankId);
      const questions = [...single, ...multi, ...judge];
      if (questions.length === 0) {
        return res.status(404).json({ error: "该题库中没有符合条件的题目" });
      }
      // 打乱顺序
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
      const formattedQuestions = questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: JSON.parse(q.options),
        type: q.type,
        meta: q.meta ? JSON.parse(q.meta) : {},
      }));
      res.json(formattedQuestions);
    } catch (err) {
      console.error(`为题库 '${bankName}' 生成试卷时出错:`, err);
      res.status(500).json({ error: "服务器内部错误: " + err.message });
    }
  });

  // app.get("/question", ...) 路由修改后的完整代码

  // 在你的路由文件顶部，定义一个全局变量来存储进度

  let currentProgress = {
    bankName: null,
    isSequential: null,
    lastIndex: null, // 用于顺序模式
  };
  app.get("/question", (req, res) => {
    // 1. 从查询参数中获取 order 和 currentId
    const { bankName, order = true } = req.query;

    if (!bankName) return res.status(400).json({ error: "缺少题库名" });

    try {
      const bankRow = db
        .prepare("SELECT id FROM banks WHERE name=?")
        .get(bankName);
      if (!bankRow) return res.status(400).json({ error: "题库不存在" });
      const bankId = bankRow.id;

      let q; // 用来存放最终的题目
      // 2. 根据 order 参数决定查询逻辑
      if (order) {
        const allQuestions = db
          .prepare("SELECT * FROM questions WHERE bank_id = ? ORDER BY id ASC")
          .all(bankId);
        if (!allQuestions || allQuestions.length === 0) {
          return res.status(404).json({ error: "该题库为空" });
        }
        const lastIndex = currentProgress.lastIndex;

        let nextIndex =
          lastIndex === null || lastIndex === undefined ? 0 : lastIndex + 1;

        if (nextIndex >= allQuestions.length) {
          nextIndex = 0; // 循环到开头
        }

        q = allQuestions[nextIndex];

        currentProgress.lastIndex = nextIndex; // 更新进度
      } else {
        // --- 随机刷题逻辑 (保持不变) ---
        const questions = db
          .prepare("SELECT * FROM questions WHERE bank_id=?")
          .all(bankId);
        if (!questions || questions.length === 0) {
          return res.status(400).json({ error: "题库为空" });
        }
        const idx = Math.floor(Math.random() * questions.length);
        q = questions[idx];
      }

      // 3. 统一处理返回结果
      if (!q) {
        return res.status(400).json({ error: "题库为空或未找到题目" });
      }

      res.json({
        id: q.id,
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

  // 删除题库
  app.delete("/bank", (req, res) => {
    const { bankName } = req.query;
    if (!bankName) {
      return res.status(400).json({ error: "缺少 bankName 参数" });
    }
    try {
      const bankRow = db
        .prepare("SELECT id FROM banks WHERE name = ?")
        .get(bankName);
      if (!bankRow) {
        return res.status(404).json({ error: "题库不存在" });
      }
      const bankId = bankRow.id;
      db.prepare("DELETE FROM questions WHERE bank_id = ?").run(bankId);
      db.prepare("DELETE FROM banks WHERE id = ?").run(bankId);
      res.json({ success: true });
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
