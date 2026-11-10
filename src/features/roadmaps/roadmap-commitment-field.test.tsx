import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoadmapCommitmentField } from "./roadmap-commitment-field";

describe("RoadmapCommitmentField", () => {
  it("emits a normalized custom commitment", () => {
    const onChange = vi.fn();
    render(<RoadmapCommitmentField onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Tùy chỉnh" }));
    fireEvent.change(screen.getByLabelText("Giờ"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Phút"), { target: { value: "30" } });

    expect(onChange).toHaveBeenLastCalledWith(270);
    expect(screen.getByText("Giá trị lưu: 270 phút (4 giờ 30 phút)")).toBeTruthy();
  });

  it("does not emit an invalid value above eight hours", () => {
    const onChange = vi.fn();
    render(<RoadmapCommitmentField value={270} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Giờ"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Phút"), { target: { value: "15" } });

    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole("alert").textContent).toContain("8 giờ");
  });
});
