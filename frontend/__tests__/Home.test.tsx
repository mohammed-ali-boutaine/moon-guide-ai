import { render, screen } from "@testing-library/react"
import Home from "../app/page"

describe("Home Page", () => {
  it("renders welcome text", () => {
    render(<Home />)
    expect(screen.getByText(/welcome/i)).toBeInTheDocument()
  })
})
