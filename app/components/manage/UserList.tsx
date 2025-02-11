'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { LoadingSpinner } from '@/app/components/ui/loading-spinner';
import { useToast } from '@/app/hooks/use-toast';
import { UserActions } from './UserActions';
import { useAuth } from '@/app/hooks/useAuth';
import { Input } from '@/app/components/ui/input';
import { Search } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/app/components/ui/pagination';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // 每页显示的用户数量
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchUsers = async () => {
    try {
      const tokenStr = localStorage.getItem('token');
      if (!tokenStr) return;

      const tokenData = JSON.parse(tokenStr);
      const response = await fetch('/api/py/auth/admin/users', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const users = await response.json();
      setUsers(users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load users',
      });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Sort users by role and email
  const sortUsers = (users: User[]) => {
    return [...users].sort((a, b) => {
      // Sort admin users first

      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;

      // Sort by email if roles are the same
      return a.email.localeCompare(b.email);
    });
  };

  const sortedUsers = sortUsers(users);

  // search filter function
  const filteredUsers = sortedUsers.filter((user) => {
    const search = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(search) ||
      (user.username?.toLowerCase() || '').includes(search)
    );
  });

  // pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // page change handler
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex justify-center items-center h-64 text-muted-foreground">
            No users found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user roles and accounts in your system
          </CardDescription>
          {/* search box */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Email</TableHead>
                  <TableHead className="w-[200px]">Username</TableHead>
                  <TableHead className="w-[100px]">Role</TableHead>
                  <TableHead className="w-[120px]">
                    <div className="text-center">Actions</div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.username || '-'}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <UserActions
                          user={user}
                          currentUser={currentUser}
                          onActionComplete={fetchUsers}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* pagination component */}
          <div className="mt-4 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={
                      currentPage === 1 ? 'pointer-events-none opacity-50' : ''
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => handlePageChange(page)}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={
                      currentPage === totalPages
                        ? 'pointer-events-none opacity-50'
                        : ''
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
