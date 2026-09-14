import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'algorithm_dashboard_todos';

/** 生成简单唯一 ID */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export default function TodoTab() {
  const [todos, setTodos] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // 初始化：从 localStorage 加载已有数据
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTodos(JSON.parse(stored));
      }
    } catch {
      // 数据损坏时忽略
    }
  }, []);

  // 每次 todos 变化时持久化
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  const handleCreate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const newTodo = {
      id: generateId(),
      name: trimmedName,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };

    setTodos((prev) => [...prev, newTodo]);
    setName('');
    setDescription('');
  };

  const canCreate = name.trim().length > 0;

  return (
    <div style={{ padding: 20 }}>
      {/* 创建表单 */}
      <div style={{ marginBottom: 24 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="事项名称"
          style={inputStyle}
          onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="事项描述（可选）"
          style={{ ...inputStyle, width: 360 }}
          onKeyDown={(e) => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
        />
        <button onClick={handleCreate} disabled={!canCreate} style={{
          ...btnStyle,
          opacity: canCreate ? 1 : 0.5,
          cursor: canCreate ? 'pointer' : 'not-allowed',
        }}>
          新增待办
        </button>
      </div>

      {/* Todo 列表 */}
      {todos.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', padding: 40 }}>
          暂无待办事项
        </p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {todos.map((todo) => (
            <li key={todo.id} style={todoItemStyle}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{todo.name}</div>
              {todo.description && (
                <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>{todo.description}</div>
              )}
              <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                {new Date(todo.createdAt).toLocaleString('zh-CN')}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 与 AlgorithmDashboard 保持一致的样式常量
const btnStyle = {
  padding: '8px 16px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  background: '#1890ff',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  marginLeft: 8,
};

const inputStyle = {
  padding: '8px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  width: 200,
  marginRight: 8,
};

const todoItemStyle = {
  padding: '12px 16px',
  borderBottom: '1px solid #f0f0f0',
  background: '#fafafa',
  borderRadius: 4,
  marginBottom: 8,
};