// file: src/pages/NotFoundPage.tsx

export function NotFoundPage() {
	return (
		<div className="container-x py-14">
			<div className="card p-8">
				<h1 className="text-2xl font-semibold">Page not found</h1>
				<p className="muted mt-2">You hit a wall.</p>
				<div className="mt-6 flex gap-3">
					<a className="btn btn-primary" href={import.meta.env.BASE_URL}>
						Go home
					</a>
					<a className="btn" href={`${import.meta.env.BASE_URL}companies`}>
						Browse companies
					</a>
				</div>
			</div>
		</div>
	);
}
