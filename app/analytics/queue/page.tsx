import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

async function getQueueData() {
  try {
    const res = await fetch(`${process.env.APP_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000'}/api/queue/analysis`, {
      next: { revalidate: 10 }
    })
    if (!res.ok) throw new Error(`Status ${res.status}`)
    return await res.json()
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

function Stat({ label, value, color = "" }: { label: string; value: number | string; color?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  )
}

function JobsTable({ title, rows }: { title: string; rows: any[] }) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>StartAfter</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Payload</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.length ? rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell><Badge variant="outline">{r.state}</Badge></TableCell>
                <TableCell>{r.retrycount ?? 0}</TableCell>
                <TableCell>{r.createdon ? new Date(r.createdon).toLocaleString() : '—'}</TableCell>
                <TableCell>{r.startafter ? new Date(r.startafter).toLocaleString() : '—'}</TableCell>
                <TableCell>{r.completedon ? new Date(r.completedon).toLocaleString() : '—'}</TableCell>
                <TableCell>
                  <pre className="max-w-[420px] overflow-x-auto text-xs">{JSON.stringify(r.data || {}, null, 2)}</pre>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">No jobs</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export const metadata = {
  title: "Analysis Queue",
}

export default async function QueueAnalyticsPage() {
  const data = await getQueueData()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Analysis Queue</h1>
      {!data?.success ? (
        <Card>
          <CardContent className="p-6 text-red-600">
            Failed to load queue info: {data?.error || 'Unknown error'}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Pending" value={data.counts?.pending ?? 0} color="text-amber-600" />
            <Stat label="Active" value={data.counts?.active ?? 0} color="text-blue-600" />
            <Stat label="Failed" value={data.counts?.failed ?? 0} color="text-red-600" />
            <Stat label="Completed" value={data.counts?.completed ?? 0} color="text-green-600" />
          </div>

          <JobsTable title="Pending Jobs" rows={data.recent?.pending || []} />
          <JobsTable title="Active Jobs" rows={data.recent?.active || []} />
          <JobsTable title="Failed Jobs" rows={data.recent?.failed || []} />
          <JobsTable title="Completed Jobs" rows={data.recent?.completed || []} />
        </>
      )}

      <Suspense>
        <div />
      </Suspense>
    </div>
  )
}
