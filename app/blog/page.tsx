'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Brain, Calendar, User, Search, BookOpen, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Blog data
const blogPosts = [
  {
    id: 1,
    title: 'Panduan Lengkap Menulis Makalah Akademik dengan AI',
    excerpt:
      'Pelajari cara memanfaatkan kekuatan AI untuk meningkatkan kualitas penulisan akademik Anda dengan 7 fase terstruktur.',
    author: 'Dr. Sarah Wijaya',
    date: '2024-01-15',
    readTime: '8 menit',
    category: 'Tutorial',
    featured: true,
  },
  {
    id: 2,
    title: 'Metodologi Penelitian Modern: Integrasi Teknologi AI',
    excerpt: 'Eksplorasi bagaimana teknologi AI dapat membantu dalam proses penelitian dan analisis data akademik.',
    author: 'Prof. Ahmad Rahman',
    date: '2024-01-12',
    readTime: '12 menit',
    category: 'Penelitian',
    featured: false,
  },
  {
    id: 3,
    title: 'Tips Kolaborasi Efektif dalam Penulisan Akademik',
    excerpt: 'Strategi dan tools untuk meningkatkan kolaborasi tim dalam proyek penulisan akademik.',
    author: 'Dr. Maya Sari',
    date: '2024-01-10',
    readTime: '6 menit',
    category: 'Kolaborasi',
    featured: false,
  },
  {
    id: 4,
    title: 'Analisis Sitasi dan Referensi: Best Practices',
    excerpt: 'Panduan komprehensif untuk mengelola sitasi dan referensi dalam penulisan akademik.',
    author: 'Dr. Budi Santoso',
    date: '2024-01-08',
    readTime: '10 menit',
    category: 'Referensi',
    featured: false,
  },
  {
    id: 5,
    title: 'Optimasi SEO untuk Publikasi Akademik Online',
    excerpt: 'Cara meningkatkan visibilitas publikasi akademik Anda di mesin pencari dan database akademik.',
    author: 'Dr. Lisa Chen',
    date: '2024-01-05',
    readTime: '7 menit',
    category: 'Publikasi',
    featured: false,
  },
  {
    id: 6,
    title: 'Etika Penggunaan AI dalam Penulisan Akademik',
    excerpt: 'Diskusi mendalam tentang aspek etis penggunaan AI dalam konteks penulisan dan penelitian akademik.',
    author: 'Prof. Indira Sharma',
    date: '2024-01-03',
    readTime: '15 menit',
    category: 'Etika',
    featured: false,
  },
];

const categories = ['Semua', 'Tutorial', 'Penelitian', 'Kolaborasi', 'Referensi', 'Publikasi', 'Etika'];

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [filteredPosts, setFilteredPosts] = useState(blogPosts);

  useEffect(() => {
    let filtered = blogPosts;

    if (selectedCategory !== 'Semua') {
      filtered = filtered.filter((post) => post.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPosts(filtered);
  }, [searchQuery, selectedCategory]);

  const featuredPost = blogPosts.find((post) => post.featured);
  const regularPosts = filteredPosts.filter((post) => !post.featured);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section with CSS illustration (non full-viewport) */}
      <section className="px-6 py-20 text-center relative hero-vivid hero-grid-thin">
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center">
              <Brain className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold mb-4 text-foreground font-heading">Ada apa dengan AI hari ini?</h1>
        </div>
      </section>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Search and Filter */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari artikel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-border"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="transition-all hover:scale-105"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Featured Post */}
        {featuredPost && selectedCategory === 'Semua' && !searchQuery && (
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 font-heading">
              <BookOpen className="w-6 h-6 text-primary" />
              Artikel Unggulan
            </h2>
            <Card className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02]">
              <CardContent className="p-8">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <Badge className="mb-4 bg-primary/20 text-primary">
                      {featuredPost.category}
                    </Badge>
                    <h3 className="text-2xl font-semibold mb-4 text-foreground">{featuredPost.title}</h3>
                    <p className="text-muted-foreground mb-6">{featuredPost.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {featuredPost.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(featuredPost.date).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {featuredPost.readTime}
                      </div>
                    </div>
                    <Button asChild className="group">
                      <Link href={`/blog/${featuredPost.id}`}>
                        Baca Selengkapnya
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Blog Posts Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 font-heading">
            <BookOpen className="w-6 h-6 text-primary" />
            {selectedCategory === 'Semua' ? 'Artikel Terbaru' : `Artikel ${selectedCategory}`}
          </h2>

          {filteredPosts.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2 text-foreground">Tidak ada artikel ditemukan</h3>
                <p className="text-muted-foreground">Coba ubah kata kunci pencarian atau pilih kategori lain.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularPosts.map((post) => (
                <Card
                  key={post.id}
                  className="border-border bg-card hover:bg-card/80 transition-all duration-300 hover:scale-[1.02] group"
                >
                  <CardContent className="p-6">
                    <Badge className="mb-4 bg-primary/20 text-primary">{post.category}</Badge>
                    <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-muted-foreground mb-4 line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {post.author}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {post.readTime}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(post.date).toLocaleDateString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <Button variant="ghost" size="sm" asChild className="group/btn">
                        <Link href={`/blog/${post.id}`}>
                          Baca
                          <ArrowRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Newsletter Section */}
        <Card className="border-border bg-card">
          <CardContent className="p-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-foreground font-heading">Tetap Update dengan Artikel Terbaru</h3>
              <p className="text-muted-foreground mb-6">
                Dapatkan tips penulisan akademik, update fitur terbaru, dan wawasan eksklusif langsung di inbox Anda.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  placeholder="Email Anda"
                  className="flex-1 border-border"
                />
                <Button className="transition-all hover:scale-105">Berlangganan</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
