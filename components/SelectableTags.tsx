'use client'
import { CheckboxGroup, CheckboxGroupProps, Chip, useCheckbox, VisuallyHidden, tv } from "@heroui/react"
import { allTags } from "app/tags"

function CustomCheckbox(props: any) {
    const checkbox = tv({
        slots: {
            base: "border-none hover:bg-default-200",
            content: "text-default-500",
        },
        variants: {
            isSelected: {
                true: {
                    base: "border-none bg-primary hover:bg-primary-500",
                    content: "text-primary-foreground",
                },
            },
            isFocusVisible: {
                true: {
                },
            },
        },
    })

    const { children, isSelected, isFocusVisible, getBaseProps, getLabelProps, getInputProps } =
        useCheckbox({
            ...props,
        })

    const styles = checkbox({ isSelected, isFocusVisible })

    return (
        <label {...getBaseProps()}>
            <VisuallyHidden>
                <input {...getInputProps()} />
            </VisuallyHidden>
            <Chip
                classNames={{
                    base: styles.base(),
                    content: styles.content(),
                }}
                color="primary"
                variant="faded"
                {...getLabelProps()}
            >
                {children}
            </Chip>
        </label>
    )
}

interface SelectableTagsProps extends Omit<CheckboxGroupProps, 'children'> {
}

export default function SelectableTags({ ...checkboxGroupProps }: SelectableTagsProps) {
    return (
        <CheckboxGroup
            className="gap-1"
            orientation="horizontal"
            {...checkboxGroupProps}
        >
            {allTags.map(tag => (
                <CustomCheckbox key={tag} value={tag}>
                    {tag}
                </CustomCheckbox>
            ))}
        </CheckboxGroup>
    )
}