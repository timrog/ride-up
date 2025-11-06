'use client'
import { Navbar, NavbarBrand, NavbarContent, NavbarItem, NavbarMenu, NavbarMenuItem, NavbarMenuToggle } from "@heroui/navbar"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { Button, Link } from "@heroui/react"
import WithAuth from "app/withAuthClient"
import { Suspense } from "react"
import FirebaseAuth from "app/firebaseAuth"

const Triburger = (<svg width="28" height="28" viewBox="0 0 7.4083 7.4083">
  <g fill="none" strokeLinecap="round" strokeWidth="1.6578">
    <path d="m0.82892 0.86191 5.7505-0.032989" stroke="#0084e6" />
    <path d="m0.82892 6.5794 5.7505-0.03299" stroke="#fe7300" />
    <path d="m0.82892 3.7207 5.7505-0.03299" stroke="#fff" />
  </g>
</svg>)

export default function () {
  return (
    <Navbar isBordered isBlurred height={100}
      className="bg-primary text-white backdrop-blur-lg"
      classNames={{ menu: "bg-black/5" }}
    >
      <NavbarBrand>
        <Link href="https://vcgh.co.uk"><img src="https://vcgh.co.uk/wp-content/uploads/2025/04/VCGH-white.svg" alt="Logo" width="250" /></Link>
      </NavbarBrand>
      <NavbarContent className="hidden sm:flex gap-8 font-black" justify="center">
        <NavbarItem>
          <Link href="/" className="text-white">Events</Link>
        </NavbarItem>
        <WithAuth role="leader">
          <NavbarItem>
            <Button href="/create" as={Link} color="secondary">Post a ride</Button>
          </NavbarItem>
        </WithAuth>
      </NavbarContent>
      <NavbarContent justify="end">
        <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />}>
          <FirebaseAuth />
        </Suspense>
        <NavbarMenuToggle
          className="sm:hidden"
          aria-controls="basic-navbar-nav"
          icon={isOpen => isOpen ? <XMarkIcon /> : Triburger}
        />
      </NavbarContent>
      <NavbarMenu className="gap-4 py-4">
        <NavbarMenuItem><Link href="/" className="text-black hover:text-secondary">Event listing</Link></NavbarMenuItem>
        <WithAuth role="leader">
          <NavbarMenuItem><Link href="/create" className="text-black hover:text-secondary">Post a ride</Link></NavbarMenuItem>
        </WithAuth>
      </NavbarMenu>
    </Navbar>

  )
}
