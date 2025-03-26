import { ColumnDef } from "@tanstack/react-table";
import { Resource } from "@/app/types/resource";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "next/navigation";

export const columns: ColumnDef<Resource>[] = [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "course_id",
    header: "Course",
  },
  {
    accessorKey: "task",
    header: "Task",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const router = useRouter();
      const resource = row.original;

      return (
        <Button
          variant="ghost"
          onClick={() => router.push(`/resources/${resource.id}`)}
        >
          View
        </Button>
      );
    },
  },
]; 