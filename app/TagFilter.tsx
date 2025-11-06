'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import SelectableTags from '@/components/SelectableTags'
import { Suspense } from 'react'
import { Chip, Dropdown, Select, SelectItem } from "@heroui/react"
import { allTags } from "./tags"

function TagFilterContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const currentTags = searchParams.get('tags')?.split(',').filter(Boolean) || []

    const handleTagChange = (selectedTags: string[]) => {
        const params = new URLSearchParams(searchParams.toString())

        if (selectedTags.length > 0) {
            params.set('tags', selectedTags.join(','))
        } else {
            params.delete('tags')
        }

        router.push(`/?${params.toString()}`)
    }

    return (
        <Select
            placeholder="Filter by event type"
            selectionMode="multiple"
            selectedKeys={currentTags}
            isMultiline
            classNames={{
                base: "max-w-xs",
                trigger: "min-h-12 py-2",
            }}
            onSelectionChange={(keys) => {
                const selectedArray = Array.from(keys as Set<string>)
                handleTagChange(selectedArray)
            }}
            renderValue={() => (
                <div className="flex flex-wrap gap-2">
                    {currentTags.map((item) => (
                        <Chip key={item} color="primary">{item}</Chip>
                    ))}
                </div>)}

        >
            {allTags.map(tag => (
                <SelectItem key={tag} textValue={tag}>
                    {tag}
                </SelectItem>
            ))}
        </Select>
    )
}

export default function TagFilter() {
    return (
        <Suspense fallback={<div className="h-16 bg-gray-100 rounded animate-pulse" />}>
            <TagFilterContent />
        </Suspense>
    )
}