import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { ThemeCardGrid } from "./ThemeCardGrid"

vi.mock("@/hooks/use-t", () => ({
  useT: () => (key: string) => key,
}))

describe("ThemeCardGrid", () => {
  it("renders five theme cards with stable testids", () => {
    render(<ThemeCardGrid value="dark" onValueChange={() => {}} />)

    expect(screen.getByTestId("theme-select")).toBeInTheDocument()
    expect(screen.getByTestId("theme-card-light")).toBeInTheDocument()
    expect(screen.getByTestId("theme-card-dark")).toBeInTheDocument()
    expect(screen.getByTestId("theme-card-pink")).toBeInTheDocument()
    expect(screen.getByTestId("theme-card-anime")).toBeInTheDocument()
    expect(screen.getByTestId("theme-card-cyber")).toBeInTheDocument()
  })

  it("calls onValueChange when neon card is selected", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(<ThemeCardGrid value="dark" onValueChange={onValueChange} />)
    await user.click(screen.getByText("Neon theme"))

    expect(onValueChange).toHaveBeenCalledWith("anime")
  })

  it("calls onValueChange when cyber card is selected", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(<ThemeCardGrid value="dark" onValueChange={onValueChange} />)
    await user.click(screen.getByText("Cyber theme"))

    expect(onValueChange).toHaveBeenCalledWith("cyber")
  })
})
