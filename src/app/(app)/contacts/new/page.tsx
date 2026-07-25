import { ContactForm } from "@/components/contacts/ContactForm";

export default function NewContactPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-zinc-900 dark:text-zinc-50">
        建立聊天人物
      </h1>
      <ContactForm />
    </div>
  );
}
