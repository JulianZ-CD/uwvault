import { render, screen } from '../../utils/test-utils';
import { TodoItem } from '@/app/todo/components/todo-item';
import { Todo } from '@/app/types/todo';
import { sortTodos, formatDate } from '@/app/todo/utils/todoUtils';
import { createMockTodo } from '@/app/__tests__/mocks/testData';

describe('TodoItem', () => {
  const mockTodo = createMockTodo({
    id: 1,
    title: 'Test Todo',
    description: 'Test Description',
    is_completed: false,
    priority: 1,
    due_date: '2024-02-29',
  });

  const mockProps = {
    todo: mockTodo,
    onToggle: jest.fn(),
    onEdit: jest.fn(),
    onDelete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders todo item correctly', () => {
      render(<TodoItem {...mockProps} />);

      // Check basic content
      expect(screen.getByText('Test Todo')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('P1')).toBeInTheDocument();

      // Check buttons and checkbox
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByLabelText('Edit todo')).toBeInTheDocument();
      expect(screen.getByLabelText('Delete todo')).toBeInTheDocument();
    });

    it('renders due date when provided', () => {
      const mockTodoWithDate = {
        ...mockTodo,
        due_date: '2024-02-29T05:00:00Z',
      };
      render(<TodoItem {...mockProps} todo={mockTodoWithDate} />);
      expect(screen.getByText('2024-02-29')).toBeInTheDocument();
    });

    it('handles null due date', () => {
      const todoWithoutDueDate = {
        ...mockTodo,
        due_date: null,
      };
      render(<TodoItem {...mockProps} todo={todoWithoutDueDate} />);
      expect(screen.queryByTestId('calendar-icon')).not.toBeInTheDocument();
      expect(screen.queryByText(/\d{2}\/\d{2}\/\d{4}/)).not.toBeInTheDocument();
    });

    it('formats date correctly', () => {
      const testDates = [
        { input: '2024-02-29T05:00:00Z', expected: '2024-02-29' },
        { input: '2024-03-01T05:00:00Z', expected: '2024-03-01' },
        { input: '2024-12-25T05:00:00Z', expected: '2024-12-25' },
      ];

      const { rerender } = render(<TodoItem {...mockProps} />);

      testDates.forEach(({ input, expected }) => {
        rerender(
          <TodoItem {...mockProps} todo={{ ...mockTodo, due_date: input }} />
        );
        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    });

    it('shows completed status', () => {
      const completedTodo = {
        ...mockTodo,
        is_completed: true,
      };
      render(<TodoItem {...mockProps} todo={completedTodo} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.getAttribute('data-state')).toBe('checked');
    });
  });

  describe('interactions', () => {
    it('handles toggle action', async () => {
      const { user } = render(<TodoItem {...mockProps} />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockProps.onToggle).toHaveBeenCalledWith(mockTodo.id);
      expect(mockProps.onToggle).toHaveBeenCalledTimes(1);
    });

    it('handles edit action', async () => {
      const { user } = render(<TodoItem {...mockProps} />);

      const editButton = screen.getByLabelText('Edit todo');
      await user.click(editButton);

      expect(mockProps.onEdit).toHaveBeenCalledWith(mockTodo);
      expect(mockProps.onEdit).toHaveBeenCalledTimes(1);
    });

    it('handles delete action with confirmation', async () => {
      const { user } = render(<TodoItem {...mockProps} />);

      // Click delete button
      const deleteButton = screen.getByLabelText('Delete todo');
      await user.click(deleteButton);

      // Wait for and confirm AlertDialog appears
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toBeInTheDocument();

      // Click confirm delete
      const confirmButton = screen.getByRole('button', { name: /delete/i });
      await user.click(confirmButton);

      expect(mockProps.onDelete).toHaveBeenCalledWith(mockTodo.id);
      expect(mockProps.onDelete).toHaveBeenCalledTimes(1);
    });

    it('does not delete when confirmation is cancelled', async () => {
      const { user } = render(<TodoItem {...mockProps} />);

      // Click delete button
      const deleteButton = screen.getByLabelText('Delete todo');
      await user.click(deleteButton);

      // Wait for and confirm AlertDialog appears
      const dialog = await screen.findByRole('alertdialog');
      expect(dialog).toBeInTheDocument();

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockProps.onDelete).not.toHaveBeenCalled();
    });
  });

  describe('priority display', () => {
    it('displays different priority levels correctly', () => {
      const priorities = [
        { level: 1, expected: 'P1' },
        { level: 2, expected: 'P2' },
        { level: 3, expected: 'P3' },
      ];

      priorities.forEach(({ level, expected }) => {
        const todoWithPriority = {
          ...mockTodo,
          priority: level,
        };
        const { rerender } = render(
          <TodoItem {...mockProps} todo={todoWithPriority} />
        );
        expect(screen.getByText(expected)).toBeInTheDocument();
        rerender(<></>);
      });
    });
  });

  describe('accessibility', () => {
    it('has accessible buttons with proper labels', () => {
      render(<TodoItem {...mockProps} />);

      expect(screen.getByLabelText('Edit todo')).toHaveAttribute(
        'aria-label',
        'Edit todo'
      );
      expect(screen.getByLabelText('Delete todo')).toHaveAttribute(
        'aria-label',
        'Delete todo'
      );
    });

    it('has accessible checkbox', () => {
      render(<TodoItem {...mockProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('todo sorting', () => {
    it('sorts todos correctly based on completion, priority, and due date', () => {
      const unsortedTodos: Todo[] = [
        createMockTodo({
          id: 1,
          title: 'Task 1',
          priority: 2,
          due_date: '2024-03-01T05:00:00Z',
        }),
        createMockTodo({
          id: 2,
          title: 'Task 2',
          is_completed: true,
          priority: 1,
          due_date: null,
        }),
        createMockTodo({
          id: 3,
          title: 'Task 3',
          priority: 1,
          due_date: '2024-02-29T05:00:00Z',
        }),
        createMockTodo({
          id: 4,
          title: 'Task 4',
          priority: 3,
          due_date: null,
        }),
      ];

      const sortedTodos = sortTodos(unsortedTodos);

      expect(sortedTodos).toEqual([
        createMockTodo({
          id: 4,
          title: 'Task 4',
          priority: 3,
          due_date: null,
        }),
        createMockTodo({
          id: 1,
          title: 'Task 1',
          priority: 2,
          due_date: '2024-03-01T05:00:00Z',
        }),
        createMockTodo({
          id: 3,
          title: 'Task 3',
          priority: 1,
          due_date: '2024-02-29T05:00:00Z',
        }),
        createMockTodo({
          id: 2,
          title: 'Task 2',
          is_completed: true,
          priority: 1,
          due_date: null,
        }),
      ]);
    });

    it('handles edge cases in sorting', () => {
      const edgeCaseTodos: Todo[] = [
        createMockTodo({
          id: 1,
          title: 'Same Priority 1',
          priority: 2,
          due_date: '2024-03-01T05:00:00Z',
        }),
        createMockTodo({
          id: 2,
          title: 'Same Priority 2',
          priority: 2,
          due_date: '2024-02-29T05:00:00Z',
        }),
        createMockTodo({
          id: 3,
          title: 'No Due Date',
          priority: 2,
          due_date: null,
        }),
      ];

      const sortedTodos = sortTodos(edgeCaseTodos);

      expect(sortedTodos).toEqual([
        createMockTodo({
          id: 2,
          title: 'Same Priority 2',
          priority: 2,
          due_date: '2024-02-29T05:00:00Z',
        }),
        createMockTodo({
          id: 1,
          title: 'Same Priority 1',
          priority: 2,
          due_date: '2024-03-01T05:00:00Z',
        }),
        createMockTodo({
          id: 3,
          title: 'No Due Date',
          priority: 2,
          due_date: null,
        }),
      ]);
    });
  });

  describe('formatDate function', () => {
    it("returns 'No due date' when date is null", () => {
      expect(formatDate(null)).toBe('No due date');
    });

    it('formats dates correctly', () => {
      const testCases = [
        { input: '2024-03-15T05:00:00Z', expected: '2024-03-15' },
        { input: '2024-12-31T05:00:00Z', expected: '2024-12-31' },
        { input: '2024-01-01T05:00:00Z', expected: '2024-01-01' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(formatDate(input)).toBe(expected);
      });
    });
  });
});
