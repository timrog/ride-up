'use client'

import { Button, ButtonGroup } from "@heroui/button"
import { Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@heroui/dropdown"
import { ChevronDownIcon } from "@heroicons/react/24/outline"
import Link from "next/link"

export default function CalendarButtons() {
    return (
        <ButtonGroup color="default">
            <Button as={Link} href="webcal:/api/calendar/feed">Add to your calendar</Button>
            <Dropdown placement="bottom-end">
                <DropdownTrigger>
                    <Button isIconOnly>
                        <ChevronDownIcon height={24} />
                    </Button>
                </DropdownTrigger>
                <DropdownMenu>
                    <DropdownItem key={1} onPress={() => navigator.clipboard.writeText(`${window.location.origin}/api/calendar/feed`)}>
                        Copy calendar feed link
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </ButtonGroup>
    )
}
