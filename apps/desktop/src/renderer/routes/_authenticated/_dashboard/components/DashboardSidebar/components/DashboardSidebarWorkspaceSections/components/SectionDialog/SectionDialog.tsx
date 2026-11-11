import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { Input } from "@superset/ui/input";
import { useState } from "react";

export function SectionDialog({
	name,
	onSave,
	onClose,
}: {
	name?: string;
	onSave: (name: string) => void;
	onClose: () => void;
}) {
	const { t } = useLingui();
	const [value, setValue] = useState(name ?? "");
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="sm:max-w-sm">
				<form
					onSubmit={(event) => {
						event.preventDefault();
						if (value.trim()) onSave(value.trim());
					}}
				>
					<DialogHeader>
						<DialogTitle>
							{name === undefined ? (
								<Trans>New section</Trans>
							) : (
								<Trans>Rename section</Trans>
							)}
						</DialogTitle>
						<DialogDescription>
							<Trans>
								Organize workspaces across projects. Their files and chats stay
								in place.
							</Trans>
						</DialogDescription>
					</DialogHeader>
					<Input
						className="my-5"
						autoFocus
						maxLength={80}
						aria-label={t({ message: "Section name" })}
						placeholder={t({ message: "Section name" })}
						value={value}
						onFocus={(event) => event.currentTarget.select()}
						onChange={(event) => setValue(event.target.value)}
					/>
					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="submit" disabled={!value.trim()}>
							{name === undefined ? <Trans>Create</Trans> : <Trans>Save</Trans>}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
