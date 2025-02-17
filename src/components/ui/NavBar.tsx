import Link from "next/link";
import { BookText } from "lucide-react";

export default function NavBar() {
  return (
    <div className="w-full p-2 flex justify-center items-center gap-4 text-white font-[family-name:var(--font-geist-sans)]">
      <Link
        href={"/home"}
        className="h-9 px-4 py-2 rounded-md flex justify-center items-center bg-primary text-primary-foreground shadow hover:bg-primary/90"
      >
        use-mirror
      </Link>
      <Link
        href={"/info"}
        className="h-9 px-4 py-2 rounded-md flex justify-center items-center bg-primary text-primary-foreground shadow hover:bg-primary/90"
      >
        <BookText className="w-4 h-4" />
      </Link>
    </div>
  );
}
