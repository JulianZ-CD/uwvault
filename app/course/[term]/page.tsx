interface PageProps {
    params: {
      term: string
    }
  }
  
  export default async function TermPage({ params }: PageProps) {
    const { term } = params
  
    // 这里可以根据 term 获取相关数据
    const response = await fetch("http://localhost:3000/api/py/course/findclass", {
      method: 'Post',
      headers: {
        'Content-Type': "application/json"
      },
      body: JSON.stringify({
        Term: term
      })
    });
    const courseData = await response.json();
  
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-4">课程学期: {term}</h1>
        {/* 这里可以展示该学期的详细信息 */}
        <pre>{JSON.stringify(courseData, null, 2)}</pre>
      </div>
    )
  }