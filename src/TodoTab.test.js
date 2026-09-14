import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TodoTab from './TodoTab';

beforeEach(() => {
  localStorage.clear();
});

describe('TodoTab', () => {
  test('renders name input, description textarea, and create button', () => {
    render(<TodoTab />);
    expect(screen.getByPlaceholderText('事项名称')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('事项描述（可选）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新增待办' })).toBeInTheDocument();
  });

  test('disables create button when name is empty', () => {
    render(<TodoTab />);
    const button = screen.getByRole('button', { name: '新增待办' });
    expect(button).toBeDisabled();
  });

  test('enables create button when name is non-empty', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const button = screen.getByRole('button', { name: '新增待办' });
    fireEvent.change(nameInput, { target: { value: '测试任务' } });
    expect(button).not.toBeDisabled();
  });

  test('creates a todo and displays it in the list', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const descInput = screen.getByPlaceholderText('事项描述（可选）');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '学习 React' } });
    fireEvent.change(descInput, { target: { value: '完成 Hooks 章节' } });
    fireEvent.click(button);

    expect(screen.getByText('学习 React')).toBeInTheDocument();
    expect(screen.getByText('完成 Hooks 章节')).toBeInTheDocument();
  });

  test('clears inputs after successful creation', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const descInput = screen.getByPlaceholderText('事项描述（可选）');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '学习 React' } });
    fireEvent.change(descInput, { target: { value: 'Hooks' } });
    fireEvent.click(button);

    expect(nameInput.value).toBe('');
    expect(descInput.value).toBe('');
  });

  test('persists todos to localStorage', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '持久化测试' } });
    fireEvent.click(button);

    const stored = JSON.parse(localStorage.getItem('algorithm_dashboard_todos'));
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('持久化测试');
    expect(stored[0].id).toBeDefined();
    expect(stored[0].createdAt).toBeDefined();
  });

  test('loads existing todos from localStorage on mount', () => {
    const existingTodo = {
      id: 'abc-123',
      name: '已存在的任务',
      description: '已有描述',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('algorithm_dashboard_todos', JSON.stringify([existingTodo]));

    render(<TodoTab />);
    expect(screen.getByText('已存在的任务')).toBeInTheDocument();
    expect(screen.getByText('已有描述')).toBeInTheDocument();
  });

  test('displays multiple todos in creation order', () => {
    render(<TodoTab />);
    const nameInput = screen.getByPlaceholderText('事项名称');
    const button = screen.getByRole('button', { name: '新增待办' });

    fireEvent.change(nameInput, { target: { value: '任务一' } });
    fireEvent.click(button);
    fireEvent.change(nameInput, { target: { value: '任务二' } });
    fireEvent.click(button);

    const items = screen.getAllByText(/任务/);
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('任务一');
    expect(items[1].textContent).toBe('任务二');
  });

  test('shows empty state when no todos exist', () => {
    render(<TodoTab />);
    expect(screen.getByText('暂无待办事项')).toBeInTheDocument();
  });
});