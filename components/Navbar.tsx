'use client'
import { Navbar, NavbarBrand, NavbarContent, NavbarMenu, NavbarMenuItem, NavbarMenuToggle } from "@heroui/navbar"
import { PlusIcon, QuestionMarkCircleIcon } from "@heroicons/react/24/outline"
import { Button, Drawer, Link } from "@heroui/react"
import { Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger } from "@heroui/dropdown"
import WithAuth from "app/withAuthClient"
import { Suspense } from "react"
import FirebaseAuth from "app/firebaseAuth"
import { useRoles } from "app/clientAuth"

const Triburger = (<svg width="28" height="28" viewBox="0 0 7.4083 7.4083">
  <g fill="none" strokeLinecap="round" strokeWidth="1.6578">
    <path d="m0.82892 0.86191 5.7505-0.032989" stroke="#0084e6" />
    <path d="m0.82892 6.5794 5.7505-0.03299" stroke="#fe7300" />
    <path d="m0.82892 3.7207 5.7505-0.03299" stroke="#fff" />
  </g>
</svg>)

export default function () {
  const { currentUser: user, roles } = useRoles()
  const itemStyle = { title: "text-large font-bold text-gray-800" }

  return (
    <Navbar isBordered isBlurred height={100}
      className="bg-primary text-white backdrop-blur-lg"
      classNames={{ menu: "bg-black/5" }}
    >
      <NavbarBrand>
        <Link href="https://vcgh.co.uk"><img src="https://vcgh.co.uk/wp-content/uploads/2025/04/VCGH-white.svg" alt="Logo" width="250" /></Link>
      </NavbarBrand>
      <NavbarContent justify="center">
      </NavbarContent>
      <NavbarContent justify="end">
        <WithAuth role="admin">
          <Button as={Link} href="/create" isIconOnly title="Post a ride" color="secondary" className="rounded-full">
            <PlusIcon height={24} />
          </Button>
        </WithAuth>
        <Button as={Link} href="/about" isIconOnly title="Help and feedback" color="default" className="rounded-full">
          <QuestionMarkCircleIcon height={24} />
        </Button>
        <Suspense fallback={<div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />}>
          <FirebaseAuth />
        </Suspense>
        <Dropdown placement="bottom-end">
          <DropdownTrigger>{Triburger}</DropdownTrigger>
          <DropdownMenu aria-label="Profile Actions" variant="flat">
            <DropdownItem key="list" href="/" classNames={itemStyle} title="Upcoming rides"></DropdownItem>
            {user && <DropdownItem key="user" href={`/user`} classNames={itemStyle}>Your profile</DropdownItem> || null}
            {roles?.includes('leader') &&
              <DropdownItem key="postRide" color="primary" href="/create" classNames={itemStyle}>Post a ride</DropdownItem> || null}
            <DropdownItem key="help" href="/about" classNames={itemStyle}>Help</DropdownItem>
            <DropdownSection>
              {roles?.includes('admin') ?
                <DropdownItem key="admin" color="primary" href="/admin" classNames={itemStyle}>Admin diagnostics</DropdownItem> : null}
              {roles?.includes('admin') ?
                <DropdownItem key="notifications" color="primary" href="/notifications" classNames={itemStyle}>Notifications (beta)</DropdownItem> : null}
            </DropdownSection>
          </DropdownMenu>
        </Dropdown>
      </NavbarContent>
    </Navbar>

  )
}
