import { useForm } from 'react-hook-form';
import {
  bookmarkFormSchema,
  bookmarkFormValues,
} from '../lib/validators/bookmarkForm.ts';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/Form.tsx';
import { Input } from './ui/Input.tsx';
import { Button } from './ui/Button.tsx';
import { Separator } from './ui/Separator.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select.tsx';
import { TagInput } from './TagInput.tsx';
import { Textarea } from './ui/Textarea.tsx';
import { getCurrentTabInfo } from '../lib/utils.ts';
import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getCsrfToken,
  getSession,
  performLoginOrLogout,
} from '../lib/auth/auth.ts';
import { getConfig, isConfigured } from '../lib/config.ts';
import { postLink } from '../lib/actions/links.ts';
import { AxiosError } from 'axios';
import { toast } from '../../hooks/use-toast.ts';
import { Toaster } from './ui/Toaster.tsx';
import { getCollections } from '../lib/actions/collections.ts';
import { getTags } from '../lib/actions/tags.ts';

let HAD_PREVIOUS_SESSION = false;
let configured = false;
const BookmarkForm = () => {
  const form = useForm<bookmarkFormValues>({
    resolver: zodResolver(bookmarkFormSchema),
    defaultValues: {
      url: '',
      name: '',
      collection: {
        name: 'Unnamed Collection',
      },
      tags: [],
      description: '',
    },
  });

  const { mutate: onSubmit, isLoading } = useMutation({
    mutationFn: async (values: bookmarkFormValues) => {
      const config = await getConfig();
      const csrfToken = await getCsrfToken(config.baseUrl);
      const session = await getSession(config.baseUrl);

      HAD_PREVIOUS_SESSION = !!session;

      if (!HAD_PREVIOUS_SESSION) {
        await performLoginOrLogout(
          `${config.baseUrl}/api/auth/callback/credentials`,
          {
            username: config.username,
            password: config.password,
            redirect: false,
            csrfToken,
            callbackUrl: `${config.baseUrl}/login`,
            json: true,
          },
        );
      }

      await postLink(config.baseUrl, values);

      if (!HAD_PREVIOUS_SESSION) {
        const url = `${config.baseUrl}/api/auth/signout`;
        await performLoginOrLogout(url, {
          username: config.username,
          password: config.password,
          redirect: false,
          csrfToken,
          callbackUrl: `${config.baseUrl}/login`,
          json: true,
        });
      }

      return;
    },
    onError: (error) => {
      if ((error as AxiosError)?.response?.status === 401) {
        toast({
          title: 'Error',
          description: 'You are not logged in. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description:
            'There was an error while trying to save the link. Please try again.',
          variant: 'destructive',
        });
      }
      return;
    },
    onSuccess: () => {
      setTimeout(() => {
        window.close();
        // I want to show some confirmation before it's closed...
      }, 1000);
      toast({
        title: 'Success',
        description: 'Link saved successfully!',
      });
    },
  });

  const { handleSubmit, control } = form;

  useEffect(() => {
    getCurrentTabInfo().then((tabInfo) => {
      form.setValue('url', tabInfo.url);
      form.setValue('name', tabInfo.title);
    });
    const getConfig = async () => {
      configured = await isConfigured();
    };
    getConfig();
  }, [form]);

  const {
    isLoading: loadingCollections,
    data: collections,
    error: collectionError,
  } = useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      const config = await getConfig();

      const csrfToken = await getCsrfToken(config.baseUrl);
      const session = await getSession(config.baseUrl);

      HAD_PREVIOUS_SESSION = !!session;

      if (!HAD_PREVIOUS_SESSION) {
        await performLoginOrLogout(
          `${config.baseUrl}/api/auth/callback/credentials`,
          {
            username: config.username,
            password: config.password,
            redirect: false,
            csrfToken,
            callbackUrl: `${config.baseUrl}/login`,
            json: true,
          },
        );
      }

      const data = await getCollections(config.baseUrl);

      if (!HAD_PREVIOUS_SESSION) {
        const url = `${config.baseUrl}/api/auth/signout`;
        await performLoginOrLogout(url, {
          username: config.username,
          password: config.password,
          redirect: false,
          csrfToken,
          callbackUrl: `${config.baseUrl}/login`,
          json: true,
        });
      }

      return data.data;
    },
    enabled: configured,
  });

  const {
    isLoading: loadingTags,
    data: tags,
    error: tagsError,
  } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const config = await getConfig();

      const csrfToken = await getCsrfToken(config.baseUrl);
      const session = await getSession(config.baseUrl);

      HAD_PREVIOUS_SESSION = !!session;

      if (!HAD_PREVIOUS_SESSION) {
        await performLoginOrLogout(
          `${config.baseUrl}/api/auth/callback/credentials`,
          {
            username: config.username,
            password: config.password,
            redirect: false,
            csrfToken,
            callbackUrl: `${config.baseUrl}/login`,
            json: true,
          },
        );
      }

      const data = await getTags(config.baseUrl);

      if (!HAD_PREVIOUS_SESSION) {
        const url = `${config.baseUrl}/api/auth/signout`;
        await performLoginOrLogout(url, {
          username: config.username,
          password: config.password,
          redirect: false,
          csrfToken,
          callbackUrl: `${config.baseUrl}/login`,
          json: true,
        });
      }

      return data.data;
    },
    enabled: configured,
  });

  return (
    <div>
      <Form {...form}>
        <form
          onSubmit={handleSubmit((e) => onSubmit(e))}
          className='space-y-3 py-1'
        >
          {collectionError ? (
            <p className='text-red-600'>
              There was an error, please make sure the website is available.
            </p>
          ) : null}
          <FormField
            control={control}
            name='url'
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input placeholder='https://www.gooogle.com' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name='collection'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Collection</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange({ name: value })}
                >
                  <FormControl>
                    <SelectTrigger>
                      {loadingCollections ? (
                        <SelectValue>Loading collections...</SelectValue>
                      ) : (
                        <SelectValue>{field.value.name}</SelectValue>
                      )}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className='max-h-[200px] overflow-y-auto'>
                    {loadingCollections ? (
                      <SelectItem value='Unnamed Collection'>
                        Loading collections...
                      </SelectItem>
                    ) : (
                      <>
                        {collections?.response?.map(
                          (collection: { id: number; name: string }) => (
                            <SelectItem
                              key={collection.id}
                              value={collection.name}
                              className='overflow-hidden whitespace-nowrap overflow-ellipsis'
                            >
                              {collection.name}
                            </SelectItem>
                          ),
                        )}
                        <Input
                          placeholder='Enter your own collection'
                          onChange={(event) =>
                            field.onChange({ name: event.target.value })
                          }
                        />
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <details className='details list-none space-y-3 py-1 '>
            <summary
              className='inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background
               transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
               focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50
               hover:bg-accent hover:text-accent-foreground hover:cursor-pointer p-2'>
              More Options
            </summary>
            {tagsError ? <p>There was an error...</p> : null}
            <FormField
              control={control}
              name='tags'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  {loadingTags ? (
                    <TagInput
                      onChange={field.onChange}
                      value={[{ name: 'Getting tags...' }]}
                      tags={[{ id: 1, name: 'Getting tags...' }]}
                    />
                  ) : tagsError ? (
                    <TagInput
                      onChange={field.onChange}
                      value={[{ name: 'Not found' }]}
                      tags={[{ id: 1, name: 'Not found' }]}
                    />
                  ) : (
                    <TagInput
                      onChange={field.onChange}
                      value={field.value ?? []}
                      tags={tags.response}
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder='Google...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name='description'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder='Description...' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
          </details>
          <div className='flex justify-end'>
            <Button disabled={isLoading} type='submit'>
              Save
            </Button>
          </div>
        </form>
      </Form>
      <Toaster />
    </div>
  );
};

export default BookmarkForm;
