"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import { useToast } from "@/components/providers/toast-provider";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { getErrorMessage } from "@/lib/api-client";
import { formatBytes } from "@/lib/format";
import type { MaterialType } from "@/types/api";
import { createMaterialText, uploadMaterialFile } from "./materials-api";

export interface CreateMaterialModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export function CreateMaterialModal({
  open,
  onClose,
  onCreated,
}: CreateMaterialModalProps) {
  const { show } = useToast();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<Exclude<MaterialType, "FILE">>("TEXT");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "file") {
        if (!file) throw new Error("Vui lòng chọn một tệp.");
        if (file.size >= 20 * 1024 * 1024) throw new Error("Dung lượng tệp phải nhỏ hơn 20MB.");
        if (!/\.(pdf|docx|txt)$/i.test(file.name))
          throw new Error("Chỉ hỗ trợ PDF, DOCX hoặc TXT.");
        await uploadMaterialFile(file);
      } else {
        await createMaterialText({ type, content: content.trim() });
      }
      show(
        mode === "file"
          ? "Tệp đã được tải lên và đang chờ trích xuất."
          : "Nội dung đã được lưu vào kho tài liệu.",
      );
      setFile(null);
      setContent("");
      await onCreated();
    } catch (error) {
      show(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Thêm tài liệu học tập"
      description="Tài liệu tải lên được xem là dữ liệu không đáng tin cậy, không phải chỉ dẫn cho AI."
      closeDisabled={loading}
      confirmClose={Boolean(file || content.trim())}
    >
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          aria-pressed={mode === "file"}
          onClick={() => setMode("file")}
          className={`rounded-lg py-2.5 text-sm font-bold ${mode === "file" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
        >
          Tải tệp
        </button>
        <button
          type="button"
          aria-pressed={mode === "text"}
          onClick={() => setMode("text")}
          className={`rounded-lg py-2.5 text-sm font-bold ${mode === "text" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
        >
          Dán văn bản
        </button>
      </div>

      <form onSubmit={submit} className="space-y-5">
        {mode === "file" ? (
          <Field
            label="Tệp PDF, DOCX hoặc TXT"
            hint="Dung lượng phải nhỏ hơn 20MB. Hệ thống sẽ kiểm tra định dạng thực tế của tệp."
          >
            <label className="focus-ring flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50/30">
              <UploadCloud className="size-8 text-indigo-600" />
              <span className="mt-3 text-sm font-extrabold text-slate-800">
                {file?.name || "Chọn tệp từ thiết bị"}
              </span>
              <span className="mt-1 text-xs text-slate-500">
                {file ? formatBytes(file.size) : "PDF · DOCX · TXT"}
              </span>
              <input
                type="file"
                className="sr-only"
                accept=".pdf,.docx,.txt"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </Field>
        ) : (
          <>
            <Field label="Loại nội dung">
              <Select
                value={type}
                onChange={(event) => setType(event.target.value as Exclude<MaterialType, "FILE">)}
              >
                <option value="TEXT">Văn bản học tập</option>
                <option value="GOAL_DESCRIPTION">Mô tả mục tiêu</option>
              </Select>
            </Field>
            <Field label="Nội dung" hint={`${content.length}/50.000 ký tự · tối thiểu 50 ký tự`}>
              <Textarea
                rows={9}
                minLength={50}
                maxLength={50000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                required
                placeholder="Dán giáo trình, ghi chú hoặc nội dung mục tiêu…"
              />
            </Field>
          </>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={mode === "file" ? !file : content.trim().length < 50}
          >
            Lưu tài liệu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
