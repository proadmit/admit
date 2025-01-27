import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Wand2 } from "lucide-react";

interface PersonalStatement {
  id: string;
  content: string;
  prompt: string;
}

interface EditorProps {
  initialStatement: PersonalStatement | undefined;
}

export function PersonalStatementEditor({ initialStatement }: EditorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(initialStatement?.content || "");
  const [prompt, setPrompt] = useState(initialStatement?.prompt || "");
  const [feedback, setFeedback] = useState("");

  const saveStatement = async () => {
    try {
      setIsSaving(true);
      const method = initialStatement ? "PUT" : "POST";
      const body = initialStatement
        ? { id: initialStatement.id, content, prompt }
        : { content, prompt };

      const response = await fetch("/api/personal-statement", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Personal statement saved");
      router.refresh();
    } catch (error) {
      toast.error("Failed to save personal statement");
    } finally {
      setIsSaving(false);
    }
  };

  const getFeedback = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to get feedback");
      }

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (error) {
      toast.error("Failed to get AI feedback");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Essay Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter your essay prompt..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Essay</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Start writing your personal statement..."
            className="min-h-[300px]"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="mt-4 flex items-center gap-4">
            <Button onClick={saveStatement} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
            <Button
              variant="secondary"
              onClick={getFeedback}
              disabled={isLoading || !content}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Get AI Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {feedback && (
        <Card>
          <CardHeader>
            <CardTitle>AI Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {feedback.split("\n").map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
