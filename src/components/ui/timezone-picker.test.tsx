import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimezonePicker } from "./timezone-picker";

describe("TimezonePicker", () => {
  it("renders trigger with placeholder when no value is provided", () => {
    const onChange = vi.fn();
    render(<TimezonePicker value="" onChange={onChange} />);

    const combobox = screen.getByRole("combobox");
    expect(combobox).toBeDefined();
    expect(combobox.getAttribute("aria-expanded")).toBe("false");
    expect(combobox.textContent).toContain("Chọn múi giờ chuẩn IANA...");
  });

  it("renders trigger with formatted timezone label when value is provided", () => {
    const onChange = vi.fn();
    render(<TimezonePicker value="Asia/Ho_Chi_Minh" onChange={onChange} />);

    const combobox = screen.getByRole("combobox");
    expect(combobox.textContent).toContain("Asia/Ho_Chi_Minh");
  });

  it("opens listbox on click and allows searching and selecting a timezone", () => {
    const onChange = vi.fn();
    render(<TimezonePicker value="" onChange={onChange} />);

    const combobox = screen.getByRole("combobox");
    fireEvent.click(combobox);

    expect(combobox.getAttribute("aria-expanded")).toBe("true");
    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeDefined();

    // Type in searchbox
    const searchbox = screen.getByRole("searchbox");
    fireEvent.change(searchbox, { target: { value: "Tokyo" } });

    // Click Tokyo option
    const option = screen.getByRole("option", { name: /Asia\/Tokyo/ });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith("Asia/Tokyo");
  });

  it("displays suggested timezone and selects it when clicked", () => {
    const onChange = vi.fn();
    render(
      <TimezonePicker
        value="UTC"
        onChange={onChange}
        suggestedTimeZone="Asia/Ho_Chi_Minh"
      />
    );

    const suggestionBtn = screen.getByRole("button", { name: "Dùng gợi ý này" });
    expect(suggestionBtn).toBeDefined();

    fireEvent.click(suggestionBtn);
    expect(onChange).toHaveBeenCalledWith("Asia/Ho_Chi_Minh");
  });
});
